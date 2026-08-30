import { IssueStatus, type Prisma, type PrismaClient } from '@prisma/client';

import { issueClassificationSchema } from '@/data/IssueJsonSchemas';
import { ARTICLE_SELECT } from '@/pipeline/articleSelect';
import type { PipelineFailure } from '@/pipeline/PipelineFailure';
import { toPipelineFailure } from '@/pipeline/PipelineFailure';
import {
  collectDuplicateOfIssueIds,
  duplicateHoldNote,
  loadDuplicateTargets,
  resolveDuplicateHolds,
  sortDuplicateAwareIssues,
} from '@/pipeline/duplicateHold';
import { DEFAULT_DEBATE_THRESHOLD, DEFAULT_EXPOSE_LIMIT } from '@/pipeline/PipelineEnv';
import {
  selectPromptArticles,
  toPromptArticle,
  type PipelineArticle,
} from '@/pipeline/selectPromptArticles';
import { stripCitationMarkers } from '@/pipeline/stripCitationMarkers';
import {
  SUMMARIZE_SCHEMA_NAME,
  summarizeSchema,
  type SummarizeResult,
} from '@/pipeline/SummarizeSchema';
import type { TextClient } from '@/pipeline/TextClient';
import { UNDECIDED_QUESTION } from '@/pipeline/UndecidedQuestion';
import type { ClassificationDigest } from '@/pipeline/prompts/ClassificationDigest';
import {
  buildSummarizeSystemPrompt,
  buildSummarizeUserPrompt,
} from '@/pipeline/prompts/SummarizePrompt';

interface SummarizeIssuesDeps {
  prisma: PrismaClient;
  textClient: TextClient;
  /** 지정하면 그 이슈만 다시 요약한다(관리자의 "요약 다시 생성"). */
  issueId?: string;
  maxArticles?: number;
  /** 이 점수 미만인 이슈는 요약하지 않는다(classify 결과). */
  debateThreshold?: number;
  /** 한 번 실행에서 요약할 이슈 수 상한. `--issue` 를 지정하면 무시한다. */
  exposeLimit?: number;
}

export interface SummarizeIssuesResult {
  summarized: number;
  skipped: number;
  /** LLM 호출·저장이 실패한 이슈. 나머지 이슈는 계속 처리한다. */
  failed: PipelineFailure[];
}

/** 프롬프트에 넣는 기사 수 상한. */
export const DEFAULT_MAX_ARTICLES = 40;

/** 마지막 요약 시점보다 기사가 이 배수 이상으로 늘면 다시 요약한다. */
const RESUMMARIZE_GROWTH_RATIO = 1.3;

/** 요약 대상 상태. 승인·반려된 이슈는 파이프라인이 자동으로 건드리지 않는다. */
const SUMMARIZABLE_STATUSES = [IssueStatus.DRAFT, IssueStatus.REVIEW];

/** 요약에 필요한 필드만 읽는다. 기사 임베딩(1536차원 배열)은 `ARTICLE_SELECT` 가 제외한다. */
const SUMMARIZE_ISSUE_SELECT = {
  id: true,
  status: true,
  question: true,
  reviewNote: true,
  debateScore: true,
  classification: true,
  summarizedAt: true,
  summarizedArticleCount: true,
  articles: { select: ARTICLE_SELECT },
} as const satisfies Prisma.IssueSelect;

/**
 * classify 가 뽑아 둔 쟁점 요지. 프롬프트의 "사전 추출 요지" 로 넘겨 기사 원문 의존을 줄인다.
 * 아직 분류되지 않았거나 형식이 어긋나면 없는 것으로 다룬다.
 * 근거: `docs/PipelineTieringSpec.md` 4.2장.
 */
export const readClassificationDigest = (value: unknown): ClassificationDigest | undefined => {
  const parsed = issueClassificationSchema.safeParse(value);

  if (!parsed.success) {
    return undefined;
  }

  return { keySentences: parsed.data.keySentences, keyClaims: parsed.data.keyClaims };
};

/** 검수 중이던 이슈를 다시 요약했을 때 관리자에게 남기는 경고. */
export const RESUMMARIZED_NOTE = '[재요약] 기사가 늘어 요약을 새로 만들었습니다. 다시 검수해 주세요.';

interface SummarizeTarget {
  question: string;
  summarizedAt: Date | null;
  summarizedArticleCount: number;
}

/**
 * 다시 요약해야 하는 이슈인지 판단한다.
 * 아직 질문이 없거나, 요약된 적이 없거나, 마지막 요약 시점보다 기사가 30% 이상 늘었으면 다시 요약한다.
 * 근거: `docs/PipelineSpec.md` 4.3장.
 */
export const shouldSummarize = (issue: SummarizeTarget, articleCount: number): boolean => {
  if (articleCount === 0) {
    return false;
  }

  if (issue.question === UNDECIDED_QUESTION) {
    return true;
  }

  if (issue.summarizedAt === null) {
    return true;
  }

  if (issue.summarizedArticleCount <= 0) {
    return true;
  }

  return articleCount >= issue.summarizedArticleCount * RESUMMARIZE_GROWTH_RATIO;
};

const toKeyPoints = (
  issueId: string,
  keyPoints: { title: string; question: string }[],
): { id: string; title: string; question: string }[] =>
  keyPoints.map((keyPoint, index) => ({
    id: `${issueId}-kp-${index + 1}`,
    title: stripCitationMarkers(keyPoint.title),
    question: stripCitationMarkers(keyPoint.question),
  }));

/** 기존 검수 메모를 지우지 않고 새 줄을 덧붙인다. 이미 같은 줄이 있으면 그대로 둔다. */
export const appendNoteLine = (reviewNote: string | null, line: string): string | null => {
  if (reviewNote === null || reviewNote.length === 0) {
    return line;
  }

  if (reviewNote.includes(line)) {
    return reviewNote;
  }

  return `${reviewNote}\n${line}`;
};

interface GenerateSummaryDraftParams {
  textClient: TextClient;
  articles: PipelineArticle[];
  maxArticles?: number;
  digest?: ClassificationDigest;
}

/**
 * LLM 을 호출해 검증된 요약 초안만 만든다(DB 를 건드리지 않는다).
 * 실패하면 예외가 그대로 올라오고, 호출자는 저장을 시작하지 않는다.
 */
export const generateSummaryDraft = async ({
  textClient,
  articles,
  maxArticles = DEFAULT_MAX_ARTICLES,
  digest,
}: GenerateSummaryDraftParams): Promise<SummarizeResult> => {
  const selected = selectPromptArticles(articles, maxArticles);

  return textClient.generateStructured({
    schema: summarizeSchema,
    schemaName: SUMMARIZE_SCHEMA_NAME,
    systemPrompt: buildSummarizeSystemPrompt(),
    userPrompt: buildSummarizeUserPrompt(selected.map(toPromptArticle), digest),
  });
};

interface ApplySummaryDraftParams {
  issue: { id: string; status: string; reviewNote: string | null };
  draft: SummarizeResult;
  articleCount: number;
  now?: Date;
  /** 검수 중 이슈에 재요약 경고를 남길지. 관리자가 직접 다시 생성한 경우에는 남기지 않는다. */
  markResummarized?: boolean;
}

/**
 * 검증된 요약 초안을 이슈에 반영한다.
 * 검수 중(REVIEW)이던 이슈는 상태를 그대로 두고 검수 메모에 재요약 경고만 남긴다.
 */
export const applySummaryDraft = async (
  tx: Prisma.TransactionClient,
  { issue, draft, articleCount, now = new Date(), markResummarized = true }: ApplySummaryDraftParams,
): Promise<void> => {
  const reviewNote =
    markResummarized && issue.status === IssueStatus.REVIEW
      ? appendNoteLine(issue.reviewNote, RESUMMARIZED_NOTE)
      : issue.reviewNote;

  await tx.issue.update({
    where: { id: issue.id },
    data: {
      question: stripCitationMarkers(draft.question),
      tags: draft.tags,
      // 프롬프트로 금지해도 모델이 `[0]` 같은 인용 번호를 넣는 경우가 있어 저장 직전에 걷어낸다.
      summary: draft.summary.map((sentence) => stripCitationMarkers(sentence)),
      keyPoints: toKeyPoints(issue.id, draft.keyPoints),
      summarizedAt: now,
      summarizedArticleCount: articleCount,
      reviewNote,
    },
  });
};

/**
 * 중복으로 보류한 이슈에 검수 메모만 남긴다(요약·추출은 하지 않는다).
 * 같은 줄이 이미 있으면 아무것도 쓰지 않는다.
 */
const holdAsDuplicate = async (
  prisma: PrismaClient,
  issue: { id: string; reviewNote: string | null },
  targetQuestion: string,
): Promise<void> => {
  const reviewNote = appendNoteLine(issue.reviewNote, duplicateHoldNote(targetQuestion));

  if (reviewNote === issue.reviewNote) {
    return;
  }

  await prisma.issue.update({ where: { id: issue.id }, data: { reviewNote } });
};

/**
 * DRAFT·REVIEW 이슈의 질문·태그·요약·핵심 쟁점을 만든다.
 * 이슈 하나가 실패해도 나머지는 계속 처리하고 실패한 id 를 결과에 담는다.
 * 근거: `docs/PipelineSpec.md` 4.3장.
 */
export const summarizeIssues = async ({
  prisma,
  textClient,
  issueId,
  maxArticles = DEFAULT_MAX_ARTICLES,
  debateThreshold = DEFAULT_DEBATE_THRESHOLD,
  exposeLimit = DEFAULT_EXPOSE_LIMIT,
}: SummarizeIssuesDeps): Promise<SummarizeIssuesResult> => {
  // `--issue` 로 하나를 지정해도 상태 제한은 유지한다(AUTO_REJECTED 제외).
  // 승인·반려된 이슈를 파이프라인이 갈아 끼우지 않는다.
  const issues = await prisma.issue.findMany({
    where: {
      status: { in: SUMMARIZABLE_STATUSES },
      ...(issueId === undefined
        ? { debateScore: { gte: debateThreshold } }
        : { id: issueId }),
    },
    orderBy: { debateScore: 'desc' },
    select: SUMMARIZE_ISSUE_SELECT,
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

  let summarized = 0;
  let skipped = 0;
  const failed: PipelineFailure[] = [];

  for (const issue of targets) {
    const forced = issueId !== undefined;
    const articleCount = issue.articles.length;
    const holdQuestion = holds.get(issue.id);

    if (holdQuestion !== undefined) {
      await holdAsDuplicate(prisma, issue, holdQuestion);

      skipped += 1;

      continue;
    }

    if (articleCount === 0 || (!forced && !shouldSummarize(issue, articleCount))) {
      skipped += 1;

      continue;
    }

    try {
      const draft = await generateSummaryDraft({
        textClient,
        articles: issue.articles,
        maxArticles,
        digest: readClassificationDigest(issue.classification),
      });

      await applySummaryDraft(prisma, { issue, draft, articleCount });

      summarized += 1;
    } catch (error) {
      const failure = toPipelineFailure(issue.id, error);
      failed.push(failure);
      console.error(`[summarize] 이슈 ${issue.id} 실패: ${failure.message}`);
    }
  }

  return { summarized, skipped, failed };
};
