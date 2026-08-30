import type { ClaimSide } from '@/domain/ClaimSide';
import type { Issue, OpinionGroup, VoteDistribution } from '@/domain/Issue';

/** 결과 화면은 주장의 제목과 근거 수만 쓰므로 근거 원문은 넘기지 않는다. */
export interface ClaimSummary {
  id: string;
  side: ClaimSide;
  title: string;
  evidenceCount: number;
}

/** 투표 결과 화면에서 쓰는 경량 이슈 정보. */
export interface IssueResultSummary {
  /** 이슈 상세 링크와 투표 기록 키로 쓰는 URL 식별자. */
  slug: string;
  question: string;
  participantCount: number;
  distribution: VoteDistribution;
  claims: ClaimSummary[];
  opinionGroups: OpinionGroup[];
}

export const toIssueResultSummary = (issue: Issue): IssueResultSummary => ({
  slug: issue.slug,
  question: issue.question,
  participantCount: issue.participantCount,
  distribution: issue.distribution,
  claims: issue.claims.map((claim) => ({
    id: claim.id,
    side: claim.side,
    title: claim.title,
    evidenceCount: claim.evidences.length,
  })),
  opinionGroups: issue.opinionGroups,
});
