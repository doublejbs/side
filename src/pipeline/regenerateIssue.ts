import { IssueStatus, type PrismaClient } from '@prisma/client';

import { toDomainIssueStatus } from '@/data/PrismaEnumMappers';
import { REGENERATABLE_STATUSES } from '@/domain/regeneratableStatuses';
import { ARTICLE_SELECT } from '@/pipeline/articleSelect';
import { applyClaimsDraft, generateClaimsDraft } from '@/pipeline/extractClaims';
import { appendWarnings, collectIssueWarnings } from '@/pipeline/linkSources';
import { RegenerateNotAllowedError } from '@/pipeline/RegenerateNotAllowedError';
import {
  appendNoteLine,
  applySummaryDraft,
  generateSummaryDraft,
  readClassificationDigest,
} from '@/pipeline/summarizeIssues';
import type { TextClient } from '@/pipeline/TextClient';
import { verifyEvidence } from '@/pipeline/verifyEvidence';

interface RegenerateIssueDeps {
  prisma: PrismaClient;
  textClient: TextClient;
  issueId: string;
  now?: Date;
}

/** 검수 메모에 남길 재생성 표시. 관리자가 언제 다시 만들었는지 알 수 있게 한다. */
const regeneratedNote = (now: Date): string => `[재생성 ${now.toISOString().slice(0, 10)}]`;

/**
 * 이슈 하나의 요약·주장·근거를 다시 만든다. 관리자 검수 화면의 "요약 다시 생성" 버튼이 호출한다.
 *
 * LLM 결과를 먼저 메모리로 받아 검증한 뒤에야 한 트랜잭션으로 저장한다.
 * 생성 중 실패하면 DB 는 전혀 바뀌지 않으므로 기존 주장·근거가 그대로 남는다.
 * 근거: `docs/PipelineSpec.md` 5장.
 */
export const regenerateIssue = async ({
  prisma,
  textClient,
  issueId,
  now = new Date(),
}: RegenerateIssueDeps): Promise<void> => {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      status: true,
      reviewNote: true,
      classification: true,
      articles: { select: ARTICLE_SELECT },
    },
  });

  if (!issue) {
    throw new Error(`이슈를 찾을 수 없습니다: ${issueId}`);
  }

  if (!REGENERATABLE_STATUSES.includes(toDomainIssueStatus(issue.status))) {
    throw new RegenerateNotAllowedError(issue.status);
  }

  const { articles } = issue;

  if (articles.length === 0) {
    throw new Error('연결된 기사가 없어 다시 생성할 수 없습니다.');
  }

  // (a) 생성 — DB 를 건드리지 않고 LLM 결과를 모두 받아 검증한다.
  const publishers = await prisma.publisher.findMany();
  const digest = readClassificationDigest(issue.classification);
  const summaryDraft = await generateSummaryDraft({ textClient, articles, digest });
  const claimsDraft = await generateClaimsDraft({
    textClient,
    question: summaryDraft.question,
    articles,
    publishers,
    digest,
  });

  // (b) 적용 — 한 트랜잭션 안에서 기존 주장을 지우고 새 결과를 저장한다.
  const baseNote = appendNoteLine(issue.reviewNote, regeneratedNote(now));

  await prisma.$transaction(async (tx) => {
    await applySummaryDraft(tx, {
      issue: { ...issue, reviewNote: baseNote },
      draft: summaryDraft,
      articleCount: articles.length,
      now,
      markResummarized: false,
    });

    await applyClaimsDraft(tx, {
      issue: { id: issue.id, reviewNote: baseNote },
      draft: claimsDraft,
    });
  });

  // (c) 검증 — 근거 id 는 주장을 저장한 뒤에야 정해지므로 트랜잭션 밖에서 이어서 돌린다.
  // 분류(classify)는 그대로 두고 summarize → extract → verify → link 만 다시 실행한다.
  await verifyEvidence({ prisma, textClient, issueId: issue.id, now });

  // (d) 연결 — 구조를 검사해 경고를 남기고 검수 대기로 넘긴다.
  const saved = await prisma.issue.findUnique({
    where: { id: issue.id },
    select: {
      reviewNote: true,
      articles: { select: { id: true } },
      claims: {
        select: { side: true, title: true, evidences: { select: { articleId: true, summary: true } } },
      },
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: IssueStatus.REVIEW,
      reviewNote: saved ? appendWarnings(saved.reviewNote, collectIssueWarnings(saved)) : baseNote,
    },
  });
};
