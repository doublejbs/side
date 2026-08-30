import { IssueStatus, type Prisma, type PrismaClient } from '@prisma/client';

import {
  toDomainMediaLeaning,
  toPrismaClaimSide,
  toPrismaEvidenceType,
} from '@/data/PrismaEnumMappers';
import type { PipelineFailure } from '@/pipeline/PipelineFailure';
import { toPipelineFailure } from '@/pipeline/PipelineFailure';
import { PIPELINE_TRANSACTION_OPTIONS } from '@/pipeline/transactionOptions';
import type { ClaimSide } from '@/domain/ClaimSide';
import { MEDIA_LEANING_ORDER } from '@/domain/mediaLeaningOrder';
import type { MediaLeaning } from '@/domain/MediaLeaning';
import { buildOpinionGroupId, getOpinionGroupLabel } from '@/domain/opinionGroupPresenter';
import { ARTICLE_SELECT, type PipelineArticleRow } from '@/pipeline/articleSelect';
import {
  collectDuplicateOfIssueIds,
  loadDuplicateTargets,
  resolveDuplicateHolds,
  sortDuplicateAwareIssues,
} from '@/pipeline/duplicateHold';
import {
  EXTRACT_SCHEMA_NAME,
  extractSchema,
  type ClaimDraft,
  type ExtractResult,
  type OpinionGroupDraft,
} from '@/pipeline/ExtractSchema';
import { normalizeDomain } from '@/pipeline/publisherDirectory';
import {
  resolveArticleSource,
  selectPromptArticles,
  toPromptArticle,
} from '@/pipeline/selectPromptArticles';
import { DEFAULT_DEBATE_THRESHOLD, DEFAULT_EXPOSE_LIMIT } from '@/pipeline/PipelineEnv';
import { stripCitationMarkers } from '@/pipeline/stripCitationMarkers';
import {
  appendNoteLine,
  DEFAULT_MAX_ARTICLES,
  readClassificationDigest,
} from '@/pipeline/summarizeIssues';
import type { TextClient } from '@/pipeline/TextClient';
import { UNDECIDED_QUESTION } from '@/pipeline/UndecidedQuestion';
import type { ClassificationDigest } from '@/pipeline/prompts/ClassificationDigest';
import {
  buildExtractSystemPrompt,
  buildExtractUserPrompt,
  type LeaningArticleGroup,
} from '@/pipeline/prompts/ExtractPrompt';

interface ExtractClaimsDeps {
  prisma: PrismaClient;
  textClient: TextClient;
  /** 지정하면 그 이슈의 기존 주장을 지우고 다시 만든다(관리자의 "요약 다시 생성"). */
  issueId?: string;
  maxArticles?: number;
  /** 이 점수 미만인 이슈는 논점을 추출하지 않는다(classify 결과). */
  debateThreshold?: number;
  /** 한 번 실행에서 처리할 이슈 수 상한. `--issue` 를 지정하면 무시한다. */
  exposeLimit?: number;
}

export interface ExtractClaimsResult {
  extracted: number;
  skipped: number;
  /** LLM 호출·저장이 실패한 이슈. 나머지 이슈는 계속 처리한다. */
  failed: PipelineFailure[];
}

/** 이슈 조회에 쓰는 `select`. 기사 임베딩은 `ARTICLE_SELECT` 가 이미 제외한다. */
const EXTRACT_ISSUE_SELECT = {
  id: true,
  status: true,
  question: true,
  reviewNote: true,
  debateScore: true,
  classification: true,
  articles: { select: ARTICLE_SELECT },
  claims: { select: { id: true } },
} as const satisfies Prisma.IssueSelect;

/** `--issue` 로 지정했을 때 허용하는 상태. 자동 제외·승인·반려된 이슈는 다시 추출하지 않는다. */
const EXTRACTABLE_STATUSES = [IssueStatus.DRAFT, IssueStatus.REVIEW];

interface PublisherRow {
  domain: string;
  name: string;
  leaning: string | null;
}

interface LeaningLookup {
  byName: Map<string, MediaLeaning>;
  byDomain: Map<string, MediaLeaning>;
}

interface PreparedClaim {
  side: Prisma.ClaimCreateWithoutIssueInput['side'];
  order: number;
  title: string;
  description: string;
  evidences: Prisma.EvidenceCreateWithoutClaimInput[];
}

export interface ClaimsDraft {
  claims: PreparedClaim[];
  mediaPerspectives: unknown[];
  commonCoverage: string[];
  opinionGroups: OpinionGroupDraft[];
  /** 범위 밖 인덱스를 가리켜 버린 근거 수. 관리자 메모에 남긴다. */
  discardedEvidences: number;
}

const buildLeaningLookup = (publishers: PublisherRow[]): LeaningLookup => {
  const byName = new Map<string, MediaLeaning>();
  const byDomain = new Map<string, MediaLeaning>();

  publishers.forEach((publisher) => {
    if (!publisher.leaning) {
      return;
    }

    const leaning = toDomainMediaLeaning(publisher.leaning);

    byName.set(publisher.name, leaning);
    byDomain.set(normalizeDomain(publisher.domain), leaning);
  });

  return { byName, byDomain };
};

/**
 * 매체 성향은 관리자가 지정한 `Publisher` 행에서만 가져온다.
 * 지정이 없으면 성향 없음으로 두고 언론 관점 집계에서 제외한다(브리프 14장).
 */
const resolveLeaning = (article: PipelineArticleRow, lookup: LeaningLookup): MediaLeaning | undefined => {
  const byName = article.publisher ? lookup.byName.get(article.publisher) : undefined;

  return byName ?? lookup.byDomain.get(normalizeDomain(article.originalLink));
};

const buildLeaningGroups = (
  articles: PipelineArticleRow[],
  leaningOf: (article: PipelineArticleRow) => MediaLeaning | undefined,
): LeaningArticleGroup[] =>
  MEDIA_LEANING_ORDER.flatMap((leaning) => {
    const members = articles
      .map((article, index) => ({ article, index }))
      .filter((entry) => leaningOf(entry.article) === leaning);

    if (members.length === 0) {
      return [];
    }

    return [
      {
        leaning,
        articles: members.map((entry) => toPromptArticle(entry.article, entry.index)),
      },
    ];
  });

interface EvidenceBuildResult {
  evidences: Prisma.EvidenceCreateWithoutClaimInput[];
  discarded: number;
}

const buildEvidenceCreateInputs = (
  claim: ClaimDraft,
  articles: PipelineArticleRow[],
): EvidenceBuildResult => {
  let discarded = 0;

  const evidences = claim.evidences.flatMap((evidence) => {
    const article = articles[evidence.articleIndex];

    if (!article) {
      discarded += 1;

      return [];
    }

    return [
      {
        type: toPrismaEvidenceType(evidence.type),
        source: resolveArticleSource(article),
        date: article.publishedAt,
        summary: evidence.summary,
        url: article.originalLink,
        article: { connect: { id: article.id } },
      },
    ];
  });

  return { evidences, discarded };
};

/**
 * 대표 기사는 성향이 일치하는 기사만 채택한다.
 * LLM 이 엉뚱한 인덱스를 고르면 같은 성향의 첫 기사로 대체한다.
 */
const resolveRepresentative = (
  index: number,
  leaning: MediaLeaning,
  articles: PipelineArticleRow[],
  leaningOf: (article: PipelineArticleRow) => MediaLeaning | undefined,
): PipelineArticleRow | undefined => {
  const picked = articles[index];

  if (picked && leaningOf(picked) === leaning) {
    return picked;
  }

  return articles.find((article) => leaningOf(article) === leaning);
};

const buildMediaPerspectives = (
  result: ExtractResult,
  articles: PipelineArticleRow[],
  leaningOf: (article: PipelineArticleRow) => MediaLeaning | undefined,
  countByLeaning: Map<MediaLeaning, number>,
) =>
  result.mediaPerspectives.flatMap((draft) => {
    const articleCount = countByLeaning.get(draft.leaning) ?? 0;

    if (articleCount === 0) {
      return [];
    }

    const representative = resolveRepresentative(
      draft.representativeArticleIndex,
      draft.leaning,
      articles,
      leaningOf,
    );

    if (!representative) {
      return [];
    }

    return [
      {
        leaning: draft.leaning as string,
        articleCount,
        frame: draft.frame,
        keywords: draft.keywords,
        representativeArticle: {
          title: representative.title,
          source: resolveArticleSource(representative),
          url: representative.originalLink,
        },
      },
    ];
  });

const toClaimIds = (indexes: number[], claimIds: string[]): string[] =>
  indexes.flatMap((index) => {
    const claimId = claimIds[index];

    return claimId ? [claimId] : [];
  });

const buildOpinionGroups = (issueId: string, drafts: OpinionGroupDraft[], claimIds: string[]) =>
  drafts.map((draft, index) => ({
    id: buildOpinionGroupId(issueId, index),
    label: getOpinionGroupLabel(index),
    share: draft.share,
    description: draft.description,
    agreesWith: toClaimIds(draft.agreesWith, claimIds),
    disagreesWith: toClaimIds(draft.disagreesWith, claimIds),
    mostDivided: toClaimIds(draft.mostDivided, claimIds),
  }));

/** 폐기한 근거가 있으면 관리자가 볼 수 있게 검수 메모에 남긴다. */
export const discardedEvidenceNote = (count: number): string => `[근거 폐기 ${count}건]`;

interface GenerateClaimsDraftParams {
  textClient: TextClient;
  question: string;
  articles: PipelineArticleRow[];
  publishers: PublisherRow[];
  maxArticles?: number;
  digest?: ClassificationDigest;
}

/**
 * LLM 을 호출해 검증된 주장·근거·언론 관점 초안만 만든다(DB 를 건드리지 않는다).
 * 실패하면 예외가 그대로 올라오고, 호출자는 저장을 시작하지 않는다.
 */
export const generateClaimsDraft = async ({
  textClient,
  question,
  articles,
  publishers,
  maxArticles = DEFAULT_MAX_ARTICLES,
  digest,
}: GenerateClaimsDraftParams): Promise<ClaimsDraft> => {
  const lookup = buildLeaningLookup(publishers);
  const leaningOf = (article: PipelineArticleRow) => resolveLeaning(article, lookup);
  const countByLeaning = new Map<MediaLeaning, number>();

  articles.forEach((article) => {
    const leaning = leaningOf(article);

    if (leaning) {
      countByLeaning.set(leaning, (countByLeaning.get(leaning) ?? 0) + 1);
    }
  });

  const selected = selectPromptArticles(articles, maxArticles);
  const result = await textClient.generateStructured({
    schema: extractSchema,
    schemaName: EXTRACT_SCHEMA_NAME,
    systemPrompt: buildExtractSystemPrompt(),
    userPrompt: buildExtractUserPrompt({
      question,
      articles: selected.map(toPromptArticle),
      leaningGroups: buildLeaningGroups(selected, leaningOf),
      digest,
    }),
  });

  const orderBySide = new Map<ClaimSide, number>();
  let discardedEvidences = 0;

  const claims = result.claims.map((draft) => {
    const order = orderBySide.get(draft.side) ?? 0;

    orderBySide.set(draft.side, order + 1);

    const built = buildEvidenceCreateInputs(draft, selected);

    discardedEvidences += built.discarded;

    return {
      side: toPrismaClaimSide(draft.side),
      order,
      // 근거의 `articleIndex` 는 그대로 두고, 독자에게 보이는 문장에서만 인용 번호를 지운다.
      title: stripCitationMarkers(draft.title),
      description: stripCitationMarkers(draft.description),
      evidences: built.evidences,
    };
  });

  return {
    claims,
    mediaPerspectives: buildMediaPerspectives(result, selected, leaningOf, countByLeaning),
    commonCoverage: result.commonCoverage,
    opinionGroups: result.opinionGroups,
    discardedEvidences,
  };
};

interface ApplyClaimsDraftParams {
  issue: { id: string; reviewNote: string | null };
  draft: ClaimsDraft;
}

/** 검증된 주장 초안을 저장한다. 기존 주장을 지우고 새로 만든 뒤 이슈 파생 필드를 갱신한다. */
export const applyClaimsDraft = async (
  tx: Prisma.TransactionClient,
  { issue, draft }: ApplyClaimsDraftParams,
): Promise<void> => {
  await tx.claim.deleteMany({ where: { issueId: issue.id } });

  const claimIds: string[] = [];

  for (const claim of draft.claims) {
    const created = await tx.claim.create({
      data: {
        issue: { connect: { id: issue.id } },
        side: claim.side,
        order: claim.order,
        title: claim.title,
        description: claim.description,
      },
    });

    claimIds.push(created.id);

    // 근거를 배치로 생성
    if (claim.evidences.length > 0) {
      await tx.evidence.createMany({
        data: claim.evidences.map((evidence) => ({
          ...evidence,
          claimId: created.id,
        })),
      });
    }
  }

  const reviewNote =
    draft.discardedEvidences > 0
      ? appendNoteLine(issue.reviewNote, discardedEvidenceNote(draft.discardedEvidences))
      : issue.reviewNote;

  await tx.issue.update({
    where: { id: issue.id },
    data: {
      mediaPerspectives: draft.mediaPerspectives as Prisma.InputJsonValue,
      commonCoverage: draft.commonCoverage,
      opinionGroups: buildOpinionGroups(issue.id, draft.opinionGroups, claimIds),
      reviewNote,
    },
  });
};

/**
 * DRAFT 이슈에서 찬반 주장 6개와 근거·언론 관점·의견 그룹 초안을 만든다.
 * 이슈 하나가 실패해도 나머지는 계속 처리하고 실패한 id 를 결과에 담는다.
 * 근거: `docs/PipelineSpec.md` 4.4장.
 */
export const extractClaims = async ({
  prisma,
  textClient,
  issueId,
  maxArticles = DEFAULT_MAX_ARTICLES,
  debateThreshold = DEFAULT_DEBATE_THRESHOLD,
  exposeLimit = DEFAULT_EXPOSE_LIMIT,
}: ExtractClaimsDeps): Promise<ExtractClaimsResult> => {
  // `--issue` 를 지정하면 상한과 임계값을 무시하되, 자동 제외된 이슈는 되살리지 않는다.
  const issues = await prisma.issue.findMany({
    where: issueId
      ? { id: issueId, status: { in: EXTRACTABLE_STATUSES } }
      : {
          status: IssueStatus.DRAFT,
          question: { not: UNDECIDED_QUESTION },
          debateScore: { gte: debateThreshold },
        },
    orderBy: { debateScore: 'desc' },
    select: EXTRACT_ISSUE_SELECT,
  });
  // 중복 표시가 없는 이슈부터, 논쟁성이 높은 순서로 상한만큼만 비싼 모델에 넘긴다.
  const targets =
    issueId === undefined ? sortDuplicateAwareIssues(issues).slice(0, exposeLimit) : issues;
  // `--issue` 로 지정하면 중복이어도 보류하지 않는다(관리자가 직접 고른 이슈다).
  const holds =
    issueId === undefined
      ? resolveDuplicateHolds(
          targets,
          await loadDuplicateTargets(prisma, collectDuplicateOfIssueIds(targets)),
        )
      : new Map<string, string>();
  const publishers = await prisma.publisher.findMany();

  let extracted = 0;
  let skipped = 0;
  const failed: PipelineFailure[] = [];

  for (const issue of targets) {
    const forced = issueId !== undefined;
    const hasClaims = issue.claims.length > 0;

    // 요약 단계에서 이미 `[중복으로 보류]` 를 남겼으므로 여기서는 대상에서만 뺀다.
    if (holds.has(issue.id)) {
      skipped += 1;

      continue;
    }

    if (issue.articles.length === 0 || issue.question === UNDECIDED_QUESTION || (!forced && hasClaims)) {
      skipped += 1;

      continue;
    }

    try {
      const draft = await generateClaimsDraft({
        textClient,
        question: issue.question,
        articles: issue.articles,
        publishers,
        maxArticles,
        digest: readClassificationDigest(issue.classification),
      });

      await prisma.$transaction(
        async (tx) => {
          await applyClaimsDraft(tx, { issue, draft });
        },
        PIPELINE_TRANSACTION_OPTIONS,
      );

      extracted += 1;
    } catch (error) {
      const failure = toPipelineFailure(issue.id, error);
      failed.push(failure);
      console.error(`[extract] 이슈 ${issue.id} 실패: ${failure.message}`);
    }
  }

  return { extracted, skipped, failed };
};
