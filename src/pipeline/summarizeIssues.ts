import { IssueStatus, type Prisma, type PrismaClient } from '@prisma/client';

import { ARTICLE_SELECT } from '@/pipeline/articleSelect';
import {
  selectPromptArticles,
  toPromptArticle,
  type PipelineArticle,
} from '@/pipeline/selectPromptArticles';
import {
  SUMMARIZE_SCHEMA_NAME,
  summarizeSchema,
  type SummarizeResult,
} from '@/pipeline/SummarizeSchema';
import type { TextClient } from '@/pipeline/TextClient';
import { UNDECIDED_QUESTION } from '@/pipeline/UndecidedQuestion';
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
}

export interface SummarizeIssuesResult {
  summarized: number;
  skipped: number;
  /** LLM 호출·저장이 실패한 이슈 id. 나머지 이슈는 계속 처리한다. */
  failed: string[];
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
  summarizedAt: true,
  summarizedArticleCount: true,
  articles: { select: ARTICLE_SELECT },
} as const satisfies Prisma.IssueSelect;

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
    title: keyPoint.title,
    question: keyPoint.question,
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
}

/**
 * LLM 을 호출해 검증된 요약 초안만 만든다(DB 를 건드리지 않는다).
 * 실패하면 예외가 그대로 올라오고, 호출자는 저장을 시작하지 않는다.
 */
export const generateSummaryDraft = async ({
  textClient,
  articles,
  maxArticles = DEFAULT_MAX_ARTICLES,
}: GenerateSummaryDraftParams): Promise<SummarizeResult> => {
  const selected = selectPromptArticles(articles, maxArticles);

  return textClient.generateStructured({
    schema: summarizeSchema,
    schemaName: SUMMARIZE_SCHEMA_NAME,
    systemPrompt: buildSummarizeSystemPrompt(),
    userPrompt: buildSummarizeUserPrompt(selected.map(toPromptArticle)),
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
      question: draft.question,
      tags: draft.tags,
      summary: draft.summary,
      keyPoints: toKeyPoints(issue.id, draft.keyPoints),
      summarizedAt: now,
      summarizedArticleCount: articleCount,
      reviewNote,
    },
  });
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
}: SummarizeIssuesDeps): Promise<SummarizeIssuesResult> => {
  // `--issue` 로 하나를 지정해도 상태 제한은 유지한다. 승인·반려된 이슈를 파이프라인이 갈아 끼우지 않는다.
  const issues = await prisma.issue.findMany({
    where: {
      status: { in: SUMMARIZABLE_STATUSES },
      ...(issueId === undefined ? {} : { id: issueId }),
    },
    select: SUMMARIZE_ISSUE_SELECT,
  });

  let summarized = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const issue of issues) {
    const forced = issueId !== undefined;
    const articleCount = issue.articles.length;

    if (articleCount === 0 || (!forced && !shouldSummarize(issue, articleCount))) {
      skipped += 1;

      continue;
    }

    try {
      const draft = await generateSummaryDraft({ textClient, articles: issue.articles, maxArticles });

      await applySummaryDraft(prisma, { issue, draft, articleCount });

      summarized += 1;
    } catch {
      failed.push(issue.id);
    }
  }

  return { summarized, skipped, failed };
};
