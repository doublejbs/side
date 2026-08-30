import { ClaimSide, IssueStatus, type PrismaClient } from '@prisma/client';

import { CLAIMS_PER_SIDE, TOTAL_CLAIM_COUNT } from '@/pipeline/ExtractSchema';

interface LinkSourcesDeps {
  prisma: PrismaClient;
  /** 지정하면 그 이슈만 검사한다(관리자의 "요약 다시 생성"). */
  issueId?: string;
}

export interface LinkSourcesResult {
  /** 검수 대기로 넘긴 이슈 수 */
  reviewed: number;
  /** 관리자에게 남긴 경고 줄 수 */
  warnings: number;
}

/** 주장 하나에 필요한 최소 근거 수. 이보다 적으면 경고를 남긴다. */
const MIN_EVIDENCE_COUNT = 2;

const SIDE_LABEL: Record<ClaimSide, string> = {
  [ClaimSide.AGREE]: '찬성',
  [ClaimSide.DISAGREE]: '반대',
};

interface LinkEvidence {
  articleId: string | null;
  summary: string;
}

interface LinkClaim {
  side: string;
  title: string;
  evidences: LinkEvidence[];
}

interface LinkIssue {
  claims: LinkClaim[];
  articles: { id: string }[];
}

/** 주장이 하나도 없으면 추출이 끝나지 않은 이슈다. 검수로 넘기지 않는다. */
const hasNoClaims = (issue: LinkIssue): boolean => issue.claims.length === 0;

const countBySide = (claims: LinkClaim[], side: ClaimSide): number =>
  claims.filter((claim) => claim.side === side).length;

/**
 * 출처 연결 결과를 검사해 관리자에게 남길 경고를 만든다. 순수 함수.
 * 근거: `docs/PipelineSpec.md` 4.5장.
 */
export const collectIssueWarnings = (issue: LinkIssue): string[] => {
  const articleIds = new Set(issue.articles.map((article) => article.id));
  const warnings: string[] = [];

  if (issue.claims.length !== TOTAL_CLAIM_COUNT) {
    warnings.push(
      `주장이 ${TOTAL_CLAIM_COUNT}개가 아닙니다 (${issue.claims.length}개) — 추출 결과를 확인해 주세요`,
    );
  }

  issue.claims.forEach((claim) => {
    if (claim.evidences.length < MIN_EVIDENCE_COUNT) {
      warnings.push(`근거가 ${claim.evidences.length}개뿐인 주장: "${claim.title}"`);
    }

    claim.evidences.forEach((evidence) => {
      if (evidence.articleId !== null && !articleIds.has(evidence.articleId)) {
        warnings.push(`이슈에 속하지 않는 기사를 가리키는 근거: "${claim.title}" — ${evidence.summary}`);
      }
    });
  });

  [ClaimSide.AGREE, ClaimSide.DISAGREE].forEach((side) => {
    const count = countBySide(issue.claims, side);

    if (count < CLAIMS_PER_SIDE) {
      warnings.push(`${SIDE_LABEL[side]} 주장이 ${CLAIMS_PER_SIDE}개 미만입니다 (${count}개)`);
    }
  });

  return warnings;
};

/** 기존 검수 메모를 유지하면서 새 경고를 아래에 덧붙인다. */
export const appendWarnings = (reviewNote: string | null, warnings: string[]): string | null => {
  if (warnings.length === 0) {
    return reviewNote;
  }

  return [reviewNote, ...warnings].filter((line): line is string => Boolean(line)).join('\n');
};

/**
 * 주장·근거가 갖춰졌는지 확인하고 이슈를 관리자 검수(REVIEW) 로 넘긴다.
 * 경고가 있어도 상태는 넘기고, 관리자가 검수 화면에서 보도록 메모에 남긴다.
 */
export const linkSources = async ({ prisma, issueId }: LinkSourcesDeps): Promise<LinkSourcesResult> => {
  const issues = await prisma.issue.findMany({
    where: { status: IssueStatus.DRAFT, ...(issueId === undefined ? {} : { id: issueId }) },
    include: { articles: { select: { id: true } }, claims: { include: { evidences: true } } },
  });

  let reviewed = 0;
  let warnings = 0;

  for (const issue of issues) {
    if (hasNoClaims(issue)) {
      continue;
    }

    // 주장 수가 6개가 아니어도 검수로 넘긴다. 관리자가 경고를 보고 판단하는 편이
    // 이슈가 DRAFT 에 조용히 남아 사라지는 것보다 낫다.
    const issueWarnings = collectIssueWarnings(issue);

    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: IssueStatus.REVIEW,
        reviewNote: appendWarnings(issue.reviewNote, issueWarnings),
      },
    });

    reviewed += 1;
    warnings += issueWarnings.length;
  }

  return { reviewed, warnings };
};
