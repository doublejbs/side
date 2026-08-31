import { IssueStatus, type Prisma, type PrismaClient } from '@prisma/client';

import type { IssueAxis } from '@/domain/IssueAxis';
import type { IssueClassification } from '@/domain/IssueClassification';
import { ARTICLE_SELECT } from '@/pipeline/articleSelect';
import type { PipelineFailure } from '@/pipeline/PipelineFailure';
import { toPipelineFailure } from '@/pipeline/PipelineFailure';
import {
  CLASSIFY_SCHEMA_NAME,
  classifySchema,
  type ClassifyResult,
} from '@/pipeline/ClassifySchema';
import { DEFAULT_DEBATE_THRESHOLD } from '@/pipeline/PipelineEnv';
import {
  selectPromptArticles,
  toPromptArticle,
  type PipelineArticle,
} from '@/pipeline/selectPromptArticles';
import { appendNoteLine, DEFAULT_MAX_ARTICLES } from '@/pipeline/summarizeIssues';
import type { TextClient } from '@/pipeline/TextClient';
import { UNDECIDED_QUESTION } from '@/pipeline/UndecidedQuestion';
import {
  buildClassifySystemPrompt,
  buildClassifyUserPrompt,
  type ExistingIssueSummary,
} from '@/pipeline/prompts/ClassifyPrompt';

interface ClassifyIssuesDeps {
  prisma: PrismaClient;
  /** 분류 전용 저가 모델(nano) 클라이언트. 요약·추출이 쓰는 클라이언트와 분리한다. */
  nanoTextClient: TextClient;
  /** 지정하면 그 이슈만 다시 분류한다. */
  issueId?: string;
  maxArticles?: number;
  /** 이 점수 미만이면 자동 제외한다. */
  debateThreshold?: number;
  now?: Date;
}

export interface ClassifyIssuesResult {
  /** 분류 결과를 저장한 이슈 수. */
  classified: number;
  /** 임계값을 넘어 DRAFT 로 남은 이슈 수. */
  passed: number;
  /** 자동 제외(AUTO_REJECTED)로 넘긴 이슈 수. */
  autoRejected: number;
  /** 중복 가능 경고를 남긴 이슈 수. */
  duplicates: number;
  /** LLM 호출·저장이 실패한 이슈. 나머지 이슈는 계속 처리한다. */
  failed: PipelineFailure[];
}

/** 중복 판단에 참고할 기존 이슈를 찾는 기간. */
const RECENT_ISSUE_WINDOW_DAYS = 30;

/** 프롬프트에 넣는 기존 이슈 수 상한. */
const MAX_EXISTING_ISSUES = 50;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** `--issue` 로 지정했을 때 허용하는 상태. 승인·반려된 이슈는 분류하지 않는다. */
const CLASSIFIABLE_STATUSES = [IssueStatus.DRAFT, IssueStatus.REVIEW];

/** 분류에 필요한 필드만 읽는다. 기사 임베딩은 `ARTICLE_SELECT` 가 제외한다. */
const CLASSIFY_ISSUE_SELECT = {
  id: true,
  status: true,
  question: true,
  reviewNote: true,
  classifiedAt: true,
  articles: { select: { ...ARTICLE_SELECT, collectedAt: true } },
} as const satisfies Prisma.IssueSelect;

type ClassifyIssueRow = Prisma.IssueGetPayload<{ select: typeof CLASSIFY_ISSUE_SELECT }>;

/** 자동 제외한 이슈의 검수 메모에 남기는 줄. 관리자가 오탐을 복원할 때 판단 근거가 된다. */
export const autoRejectedNote = (reason: string): string => `[자동 제외] ${reason}`;

/** 중복으로 보이는 이슈가 있을 때 남기는 경고. 병합은 관리자가 결정한다. */
export const duplicateNote = (question: string): string => `[중복 가능] ${question}`;

/**
 * 다시 분류해야 하는 이슈인지 판단한다.
 * 한 번도 분류된 적이 없거나, 분류 이후에 수집된 기사가 붙었으면 다시 분류한다.
 *
 * 스펙(4.1장)은 `classifiedAt < updatedAt` 으로 적었지만, 분류 결과 저장 자체가
 * `updatedAt` 을 갱신하므로 그대로 쓰면 매 실행마다 다시 분류하게 된다.
 * 스펙이 뜻한 "기사가 더 붙은 경우"를 기사 수집 시각으로 직접 확인한다.
 */
export const shouldClassify = (
  issue: { classifiedAt: Date | null },
  articles: { collectedAt: Date }[],
): boolean => {
  if (articles.length === 0) {
    return false;
  }

  const { classifiedAt } = issue;

  if (classifiedAt === null) {
    return true;
  }

  return articles.some((article) => article.collectedAt > classifiedAt);
};

/** 임계값을 넘고 정책 논쟁으로 판정됐는지. */
export const isPassing = (result: ClassifyResult, debateThreshold: number): boolean =>
  result.isPolicyDebate && result.debateScore >= debateThreshold;

const startOfWindow = (now: Date): Date =>
  new Date(now.getTime() - RECENT_ISSUE_WINDOW_DAYS * DAY_IN_MS);

/** 중복 판단에 참고할 최근 이슈 목록. 질문이 아직 없는 이슈는 비교 대상이 아니다. */
const loadExistingIssues = async (
  prisma: PrismaClient,
  now: Date,
): Promise<ExistingIssueSummary[]> => {
  const rows = await prisma.issue.findMany({
    where: {
      createdAt: { gte: startOfWindow(now) },
      question: { not: UNDECIDED_QUESTION },
    },
    select: { id: true, question: true, topic: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_EXISTING_ISSUES,
  });

  return rows.map((row) => ({ id: row.id, question: row.question, topic: row.topic }));
};

interface GenerateClassificationDraftParams {
  nanoTextClient: TextClient;
  question: string;
  articles: PipelineArticle[];
  existingIssues: ExistingIssueSummary[];
  maxArticles?: number;
}

/**
 * LLM 을 호출해 검증된 분류 초안만 만든다(DB 를 건드리지 않는다).
 * 실패하면 예외가 그대로 올라오고, 호출자는 저장을 시작하지 않는다.
 */
export const generateClassificationDraft = async ({
  nanoTextClient,
  question,
  articles,
  existingIssues,
  maxArticles = DEFAULT_MAX_ARTICLES,
}: GenerateClassificationDraftParams): Promise<ClassifyResult> => {
  const selected = selectPromptArticles(articles, maxArticles);

  return nanoTextClient.generateStructured({
    schema: classifySchema,
    schemaName: CLASSIFY_SCHEMA_NAME,
    systemPrompt: buildClassifySystemPrompt(),
    userPrompt: buildClassifyUserPrompt({
      question,
      articles: selected.map(toPromptArticle),
      existingIssues,
    }),
  });
};

/** 모델이 지어낸 id 는 버린다. 목록에 실제로 있고 자기 자신이 아닌 id 만 병합 후보로 남긴다. */
const resolveDuplicate = (
  result: ClassifyResult,
  issueId: string,
  existingIssues: ExistingIssueSummary[],
): ExistingIssueSummary | undefined => {
  if (!result.duplicateOfIssueId || result.duplicateOfIssueId === issueId) {
    return undefined;
  }

  return existingIssues.find((issue) => issue.id === result.duplicateOfIssueId);
};

/** 구조화 출력의 `null` 을 도메인 선택 필드로 옮긴다. */
const toClassification = (
  result: ClassifyResult,
  duplicate: ExistingIssueSummary | undefined,
  axes: IssueAxis[],
): IssueClassification => ({
  isPolicyDebate: result.isPolicyDebate,
  debateScore: result.debateScore,
  topic: result.topic,
  reason: result.reason,
  entities: result.entities,
  keySentences: result.keySentences,
  keyClaims: result.keyClaims,
  ...(duplicate ? { duplicateOfIssueId: duplicate.id } : {}),
  axes,
});

/**
 * 모델이 제안한 관점 축. 확신이 없으면 빈 배열이 오고, 그때는 축이 없는 이슈로 남는다.
 * 검수 화면에서 관리자가 고칠 수 있으므로 여기서는 제안을 그대로 저장한다.
 * 근거: `docs/PerspectiveSpec.md` 1장.
 */
const toIssueAxes = (result: ClassifyResult): IssueAxis[] =>
  result.axes.map((item) => ({ axis: item.axis, agreeDirection: item.agreeDirection }));

interface ApplyClassificationParams {
  issue: { id: string; reviewNote: string | null };
  result: ClassifyResult;
  duplicate?: ExistingIssueSummary;
  debateThreshold: number;
  now?: Date;
}

/**
 * 검증된 분류 결과를 이슈에 반영한다.
 * 임계값을 넘지 못하면 자동 제외로 넘기고, 중복 후보가 있으면 경고만 남긴다(병합하지 않는다).
 */
export const applyClassification = async (
  tx: Prisma.TransactionClient,
  { issue, result, duplicate, debateThreshold, now = new Date() }: ApplyClassificationParams,
): Promise<void> => {
  const passed = isPassing(result, debateThreshold);
  const axes = toIssueAxes(result);
  const withDuplicateNote = duplicate
    ? appendNoteLine(issue.reviewNote, duplicateNote(duplicate.question))
    : issue.reviewNote;
  const reviewNote = passed
    ? withDuplicateNote
    : appendNoteLine(withDuplicateNote, autoRejectedNote(result.reason));

  await tx.issue.update({
    where: { id: issue.id },
    data: {
      debateScore: result.debateScore,
      topic: result.topic,
      // 축은 `Issue.axes` 가 정본이다. 분류 Json 에도 같이 남겨 모델이 무엇을 제안했는지 보존한다.
      // @ts-expect-error Prisma's JSON type doesn't accept typed arrays
      classification: toClassification(result, duplicate, axes),
      // @ts-expect-error Prisma's JSON type doesn't accept typed arrays
      axes,
      classifiedAt: now,
      reviewNote,
      ...(passed ? {} : { status: IssueStatus.AUTO_REJECTED }),
    },
  });
};

/**
 * DRAFT 이슈가 찬반이 갈리는 정책 논쟁인지 저가 모델로 판별하고, 미달 이슈를 자동 제외한다.
 * 이슈 하나가 실패해도 나머지는 계속 처리하고 실패한 id 를 결과에 담는다.
 * 근거: `docs/PipelineTieringSpec.md` 4.1장.
 */
export const classifyIssues = async ({
  prisma,
  nanoTextClient,
  issueId,
  maxArticles = DEFAULT_MAX_ARTICLES,
  debateThreshold = DEFAULT_DEBATE_THRESHOLD,
  now = new Date(),
}: ClassifyIssuesDeps): Promise<ClassifyIssuesResult> => {
  const issues: ClassifyIssueRow[] = await prisma.issue.findMany({
    where:
      issueId === undefined
        ? { status: IssueStatus.DRAFT }
        : { id: issueId, status: { in: CLASSIFIABLE_STATUSES } },
    select: CLASSIFY_ISSUE_SELECT,
  });
  const existingIssues = await loadExistingIssues(prisma, now);

  let classified = 0;
  let passed = 0;
  let autoRejected = 0;
  let duplicates = 0;
  const failed: PipelineFailure[] = [];

  for (const issue of issues) {
    const forced = issueId !== undefined;

    if (issue.articles.length === 0 || (!forced && !shouldClassify(issue, issue.articles))) {
      continue;
    }

    try {
      const result = await generateClassificationDraft({
        nanoTextClient,
        question: issue.question,
        articles: issue.articles,
        existingIssues: existingIssues.filter((candidate) => candidate.id !== issue.id),
        maxArticles,
      });
      const duplicate = resolveDuplicate(result, issue.id, existingIssues);

      await applyClassification(prisma, { issue, result, duplicate, debateThreshold, now });

      classified += 1;

      if (isPassing(result, debateThreshold)) {
        passed += 1;
      } else {
        autoRejected += 1;
      }

      if (duplicate) {
        duplicates += 1;
      }
    } catch (error) {
      const failure = toPipelineFailure(issue.id, error);
      failed.push(failure);
      console.error(`[classify] 이슈 ${issue.id} 실패: ${failure.message}`);
    }
  }

  return { classified, passed, autoRejected, duplicates, failed };
};
