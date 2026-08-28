import { IssueStatus, type PrismaClient } from '@prisma/client';

import { cosineSimilarity } from '@/pipeline/cosineSimilarity';
import type { EmbeddingClient } from '@/pipeline/EmbeddingClient';
import { greedyCluster } from '@/pipeline/greedyCluster';
import { meanVector } from '@/pipeline/meanVector';
import { UNDECIDED_QUESTION } from '@/pipeline/UndecidedQuestion';

export interface ClusterArticlesDeps {
  prisma: PrismaClient;
  embeddingClient: EmbeddingClient;
  /** 최근 이슈 판단 기준 시각 (기본 현재) */
  now?: Date;
  /** 이슈 배정·묶기 코사인 유사도 임계값 (기본 0.82) */
  similarityThreshold?: number;
  /** 새 이슈로 만들 최소 기사 수 (기본 3) */
  minClusterSize?: number;
  /** 배정 대상으로 볼 최근 기사 기간 (기본 14일) */
  windowDays?: number;
  /** 임베딩 배치 크기 (기본 100) */
  embedBatchSize?: number;
  /**
   * 기대 임베딩 차원. 주지 않으면 이번 실행에서 처음 만난 유효 임베딩의 길이로 정한다.
   * 임베딩 모델을 바꾸면 차원이 섞이는데, 그런 기사는 배정·묶기에서 모두 제외한다.
   */
  expectedDimension?: number;
  /** 한 번에 훑을 기사 수 상한 (기본 2000). 남은 기사는 다음 실행에서 이어 처리한다. */
  maxArticlesPerRun?: number;
}

export interface ClusterArticlesResult {
  /** 이번 실행에서 임베딩한 기사 수 */
  embedded: number;
  /** 이슈에 배정한 기사 수 */
  assigned: number;
  /** 새로 만든 이슈 수 */
  created: number;
  /** 묶이지 않아(또는 임베딩이 없어) 다음 실행으로 미룬 기사 수 */
  deferred: number;
  /** 기대 차원과 달라 건너뛴 기사 수 */
  skippedDimension: number;
}

interface IssueCandidate {
  id: string;
  centroid: number[];
  articleCount: number;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.82;

const DEFAULT_MIN_CLUSTER_SIZE = 3;

const DEFAULT_WINDOW_DAYS = 14;

const DEFAULT_EMBED_BATCH_SIZE = 100;

/** 한 실행에서 훑는 기사 수 상한. 백로그가 커도 실행 시간이 폭발하지 않게 한다. */
const DEFAULT_MAX_ARTICLES_PER_RUN = 2000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 배정 대상 이슈 상태. 반려(REJECTED)된 이슈에는 새 기사를 붙이지 않는다. */
const ASSIGNABLE_STATUSES = [IssueStatus.DRAFT, IssueStatus.REVIEW, IssueStatus.PUBLISHED];

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

/** 기사 하나를 더한 뒤의 centroid: `(c*n + v)/(n+1)`. */
const nextCentroid = (centroid: number[], vector: number[], articleCount: number): number[] => {
  if (centroid.length !== vector.length) {
    return [...vector];
  }

  return centroid.map((value, index) => (value * articleCount + vector[index]) / (articleCount + 1));
};

/**
 * 기사 임베딩 → 기존 이슈 배정 → 남은 기사 묶어 새 이슈 생성.
 * 근거: docs/PipelineSpec.md 4.2.
 */
export const clusterArticles = async (deps: ClusterArticlesDeps): Promise<ClusterArticlesResult> => {
  const { prisma, embeddingClient } = deps;
  const now = deps.now ?? new Date();
  const similarityThreshold = deps.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const minClusterSize = deps.minClusterSize ?? DEFAULT_MIN_CLUSTER_SIZE;
  const windowDays = deps.windowDays ?? DEFAULT_WINDOW_DAYS;
  const embedBatchSize = deps.embedBatchSize ?? DEFAULT_EMBED_BATCH_SIZE;
  const maxArticlesPerRun = deps.maxArticlesPerRun ?? DEFAULT_MAX_ARTICLES_PER_RUN;

  let dimension = deps.expectedDimension;
  let skippedDimension = 0;

  // (a) 임베딩이 비어 있는 기사부터 채운다.
  const pending = await prisma.article.findMany({
    where: { embedding: { isEmpty: true } },
    orderBy: { publishedAt: 'asc' },
    take: maxArticlesPerRun,
    select: { id: true, title: true, description: true },
  });

  const embeddingById = new Map<string, number[]>();
  let embedded = 0;

  for (const batch of chunk(pending, embedBatchSize)) {
    const vectors = await embeddingClient.embed(
      batch.map((article) => `${article.title}\n${article.description}`),
    );

    for (let index = 0; index < batch.length; index += 1) {
      const vector = vectors[index];

      if (vector === undefined || vector.length === 0) {
        continue;
      }

      if (dimension === undefined) {
        dimension = vector.length;
      }

      if (vector.length !== dimension) {
        skippedDimension += 1;

        continue;
      }

      await prisma.article.update({
        where: { id: batch[index].id },
        data: { embedding: vector },
      });

      embeddingById.set(batch[index].id, vector);
      embedded += 1;
    }
  }

  // (b) 미배정 기사를 발행일 순으로 훑으며 최근 이슈에 배정한다.
  const unassigned = await prisma.article.findMany({
    where: { issueId: null },
    orderBy: { publishedAt: 'asc' },
    take: maxArticlesPerRun,
    select: { id: true, embedding: true },
  });

  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);
  // 최근성 기준은 이슈 수정 시각이 아니라 이슈에 붙은 기사의 발행일이다.
  // (검수로 이슈를 손대는 것만으로 오래된 이슈가 다시 열리면 안 된다.)
  const recentIssues = await prisma.issue.findMany({
    where: {
      status: { in: ASSIGNABLE_STATUSES },
      articles: { some: { publishedAt: { gte: windowStart } } },
    },
    select: { id: true, centroid: true, _count: { select: { articles: true } } },
  });

  const candidates: IssueCandidate[] = recentIssues
    .filter((issue) => issue.centroid.length > 0)
    .map((issue) => ({
      id: issue.id,
      centroid: [...issue.centroid],
      articleCount: issue._count.articles,
    }));

  const leftovers: { id: string; vector: number[] }[] = [];
  const assignedArticleIds = new Map<string, string[]>();
  let assigned = 0;
  let deferred = 0;

  for (const article of unassigned) {
    const vector = embeddingById.get(article.id) ?? article.embedding;

    if (vector.length === 0) {
      deferred += 1;

      continue;
    }

    if (dimension === undefined) {
      dimension = vector.length;
    }

    if (vector.length !== dimension) {
      skippedDimension += 1;

      continue;
    }

    let best: IssueCandidate | null = null;
    let bestSimilarity = Number.NEGATIVE_INFINITY;

    candidates.forEach((candidate) => {
      if (candidate.centroid.length !== vector.length) {
        return;
      }

      const similarity = cosineSimilarity(candidate.centroid, vector);

      if (similarity >= similarityThreshold && similarity > bestSimilarity) {
        best = candidate;
        bestSimilarity = similarity;
      }
    });

    if (best === null) {
      leftovers.push({ id: article.id, vector: [...vector] });

      continue;
    }

    const target = best as IssueCandidate;

    target.centroid = nextCentroid(target.centroid, vector, target.articleCount);
    target.articleCount += 1;
    assignedArticleIds.set(target.id, [...(assignedArticleIds.get(target.id) ?? []), article.id]);
    assigned += 1;
  }

  // 기사 배정과 centroid 는 이슈별로 한 번씩만 기록한다(기사마다 UPDATE 하지 않는다).
  for (const [issueId, articleIds] of assignedArticleIds) {
    const candidate = candidates.find((entry) => entry.id === issueId);

    await prisma.article.updateMany({ where: { id: { in: articleIds } }, data: { issueId } });

    if (candidate) {
      await prisma.issue.update({ where: { id: issueId }, data: { centroid: candidate.centroid } });
    }
  }

  // (c) 남은 기사끼리 묶어 최소 크기를 넘으면 새 이슈를 만든다.
  const groups = greedyCluster(
    leftovers.map((leftover) => leftover.vector),
    similarityThreshold,
  );

  let created = 0;

  for (const group of groups) {
    if (group.length < minClusterSize) {
      deferred += group.length;

      continue;
    }

    const members = group.map((index) => leftovers[index]);
    const centroid = meanVector(members.map((member) => member.vector));

    await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          status: IssueStatus.DRAFT,
          question: UNDECIDED_QUESTION,
          tags: [],
          summary: [],
          keyPoints: [],
          commonCoverage: [],
          mediaPerspectives: [],
          opinionGroups: [],
          centroid,
        },
        select: { id: true },
      });

      await tx.article.updateMany({
        where: { id: { in: members.map((member) => member.id) } },
        data: { issueId: issue.id },
      });
    });

    created += 1;
    assigned += members.length;
  }

  return { embedded, assigned, created, deferred, skippedDimension };
};
