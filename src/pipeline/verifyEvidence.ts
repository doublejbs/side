import { IssueStatus, type Prisma, type PrismaClient } from '@prisma/client';

import {
  toDomainClaimSide,
  toDomainEvidenceSupport,
  toPrismaEvidenceSupport,
  toPrismaEvidenceType,
} from '@/data/PrismaEnumMappers';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import type { EvidenceVerdict } from '@/domain/EvidenceVerification';
import { appendWarnings } from '@/pipeline/linkSources';
import type { TextClient } from '@/pipeline/TextClient';
import { VERIFY_SCHEMA_NAME, verifySchema, type VerifyResult } from '@/pipeline/VerifySchema';
import {
  buildVerifySystemPrompt,
  buildVerifyUserPrompt,
  type VerifyPromptClaim,
} from '@/pipeline/prompts/VerifyPrompt';

interface VerifyEvidenceDeps {
  prisma: PrismaClient;
  textClient: TextClient;
  /** 지정하면 그 이슈만 다시 검증한다(관리자의 "요약 다시 생성"). */
  issueId?: string;
  now?: Date;
}

export interface VerifyEvidenceResult {
  /** 검증 결과를 저장한 이슈 수. */
  verified: number;
  /** 미지지(무관·반박)로 판정된 근거 수. */
  flagged: number;
  /** LLM 호출·저장이 실패한 이슈 id. 나머지 이슈는 계속 처리한다. */
  failed: string[];
}

/** `--issue` 로 지정했을 때 허용하는 상태. 승인·반려된 이슈는 검증하지 않는다. */
const VERIFIABLE_STATUSES = [IssueStatus.DRAFT, IssueStatus.REVIEW];

/** 주장을 뒷받침하려면 지지·부분 근거가 이 수보다 많아야 한다. */
const MIN_SUPPORTIVE_COUNT = 2;

/** 검증에 필요한 필드만 읽는다. 기사 임베딩은 가져오지 않는다. */
const VERIFY_ISSUE_SELECT = {
  id: true,
  status: true,
  question: true,
  reviewNote: true,
  claims: {
    select: {
      id: true,
      side: true,
      order: true,
      title: true,
      description: true,
      evidences: {
        select: {
          id: true,
          type: true,
          source: true,
          summary: true,
          support: true,
          article: { select: { title: true, description: true } },
        },
      },
    },
  },
} as const satisfies Prisma.IssueSelect;

type VerifyIssueRow = Prisma.IssueGetPayload<{ select: typeof VERIFY_ISSUE_SELECT }>;

/** 주장을 지지하지 못하는 판정. 삭제하지 않고 경고만 남긴다. */
const UNSUPPORTIVE: EvidenceSupport[] = [EvidenceSupport.UNRELATED, EvidenceSupport.CONTRADICTS];

const SUPPORTIVE: EvidenceSupport[] = [EvidenceSupport.SUPPORTS, EvidenceSupport.PARTIAL];

/** 미지지 근거가 섞인 주장에 남기는 경고. */
export const unsupportedEvidenceNote = (claimTitle: string, count: number): string =>
  `[근거 검증] 주장 "${claimTitle}": 미지지 ${count}건`;

/** 지지 근거가 거의 없는 주장에 남기는 경고. */
export const weakSupportNote = (claimTitle: string, count: number): string =>
  `[근거 검증] 주장 "${claimTitle}": 지지 근거가 ${count}건뿐입니다`;

interface WarningClaim {
  title: string;
  evidences: { id: string }[];
}

/**
 * 판정 결과를 주장별로 모아 관리자에게 남길 경고를 만든다. 순수 함수.
 * 근거: `docs/PipelineTieringSpec.md` 4.3장.
 */
export const collectVerificationWarnings = (
  claims: WarningClaim[],
  supportById: Map<string, EvidenceSupport>,
): string[] =>
  claims.flatMap((claim) => {
    const supports = claim.evidences.flatMap((evidence) => {
      const support = supportById.get(evidence.id);

      return support ? [support] : [];
    });
    const unsupported = supports.filter((support) => UNSUPPORTIVE.includes(support)).length;
    const supportive = supports.filter((support) => SUPPORTIVE.includes(support)).length;
    const warnings: string[] = [];

    if (unsupported > 0) {
      warnings.push(unsupportedEvidenceNote(claim.title, unsupported));
    }

    if (supportive < MIN_SUPPORTIVE_COUNT) {
      warnings.push(weakSupportNote(claim.title, supportive));
    }

    return warnings;
  });

/** 이슈 행을 프롬프트가 쓰는 주장 목록으로 옮긴다. */
export const toVerifyPromptClaims = (issue: VerifyIssueRow): VerifyPromptClaim[] =>
  issue.claims.map((claim) => ({
    side: toDomainClaimSide(claim.side),
    title: claim.title,
    description: claim.description,
    evidences: claim.evidences.map((evidence) => ({
      id: evidence.id,
      type: evidence.type,
      source: evidence.source,
      summary: evidence.summary,
      ...(evidence.article
        ? { articleTitle: evidence.article.title, articleDescription: evidence.article.description }
        : {}),
    })),
  }));

const countEvidences = (issue: VerifyIssueRow): number =>
  issue.claims.reduce((total, claim) => total + claim.evidences.length, 0);

interface GenerateVerificationDraftParams {
  textClient: TextClient;
  question: string;
  claims: VerifyPromptClaim[];
}

/**
 * LLM 을 호출해 검증된 판정 목록만 만든다(DB 를 건드리지 않는다).
 * 실패하면 예외가 그대로 올라오고, 호출자는 저장을 시작하지 않는다.
 */
export const generateVerificationDraft = async ({
  textClient,
  question,
  claims,
}: GenerateVerificationDraftParams): Promise<VerifyResult> =>
  textClient.generateStructured({
    schema: verifySchema,
    schemaName: VERIFY_SCHEMA_NAME,
    systemPrompt: buildVerifySystemPrompt(),
    userPrompt: buildVerifyUserPrompt({ question, claims }),
  });

/** 입력으로 준 근거 id 만 남긴다. 모델이 지어낸 id 는 조용히 버린다. */
export const selectKnownVerdicts = (
  verdicts: EvidenceVerdict[],
  knownIds: Set<string>,
): EvidenceVerdict[] => {
  const seen = new Set<string>();

  return verdicts.filter((verdict) => {
    if (!knownIds.has(verdict.evidenceId) || seen.has(verdict.evidenceId)) {
      return false;
    }

    seen.add(verdict.evidenceId);

    return true;
  });
};

interface ApplyVerificationParams {
  issue: VerifyIssueRow;
  verdicts: EvidenceVerdict[];
  now?: Date;
}

/**
 * 검증 결과를 근거에 반영하고 경고를 검수 메모에 누적한다.
 * 무관·반박 근거도 삭제하지 않는다. 관리자가 보고 판단한다.
 */
export const applyVerificationDraft = async (
  tx: Prisma.TransactionClient,
  { issue, verdicts, now = new Date() }: ApplyVerificationParams,
): Promise<number> => {
  const supportById = new Map<string, EvidenceSupport>();

  issue.claims.forEach((claim) => {
    claim.evidences.forEach((evidence) => {
      if (evidence.support) {
        supportById.set(evidence.id, toDomainEvidenceSupport(evidence.support));
      }
    });
  });

  for (const verdict of verdicts) {
    await tx.evidence.update({
      where: { id: verdict.evidenceId },
      data: {
        support: toPrismaEvidenceSupport(verdict.support),
        verificationNote: verdict.note,
        type: toPrismaEvidenceType(verdict.type),
      },
    });

    supportById.set(verdict.evidenceId, verdict.support);
  }

  const warnings = collectVerificationWarnings(issue.claims, supportById);

  await tx.issue.update({
    where: { id: issue.id },
    data: {
      verifiedAt: now,
      reviewNote: appendWarnings(issue.reviewNote, warnings),
    },
  });

  return verdicts.filter((verdict) => UNSUPPORTIVE.includes(verdict.support)).length;
};

/**
 * 주장에 붙은 근거가 실제로 그 주장을 지지하는지 다시 판정한다.
 * 이슈 하나가 실패해도 나머지는 계속 처리하고 실패한 id 를 결과에 담는다.
 * 근거: `docs/PipelineTieringSpec.md` 4.3장.
 */
export const verifyEvidence = async ({
  prisma,
  textClient,
  issueId,
  now = new Date(),
}: VerifyEvidenceDeps): Promise<VerifyEvidenceResult> => {
  const issues: VerifyIssueRow[] = await prisma.issue.findMany({
    where:
      issueId === undefined
        ? { status: IssueStatus.DRAFT, verifiedAt: null }
        : { id: issueId, status: { in: VERIFIABLE_STATUSES } },
    select: VERIFY_ISSUE_SELECT,
  });

  let verified = 0;
  let flagged = 0;
  const failed: string[] = [];

  for (const issue of issues) {
    if (countEvidences(issue) === 0) {
      continue;
    }

    try {
      const draft = await generateVerificationDraft({
        textClient,
        question: issue.question,
        claims: toVerifyPromptClaims(issue),
      });
      const knownIds = new Set(
        issue.claims.flatMap((claim) => claim.evidences.map((evidence) => evidence.id)),
      );
      const verdicts = selectKnownVerdicts(draft.verdicts, knownIds);

      flagged += await prisma.$transaction(async (tx) =>
        applyVerificationDraft(tx, { issue, verdicts, now }),
      );

      verified += 1;
    } catch {
      failed.push(issue.id);
    }
  }

  return { verified, flagged, failed };
};
