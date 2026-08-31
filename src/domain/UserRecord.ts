import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';

export interface VoteRecord {
  issueId: string;
  choice: VoteChoice;
  /** ISO 8601 */
  votedAt: string;
}

export interface ClaimFeedbackRecord {
  claimId: string;
  feedback: ClaimFeedback;
}

export interface PerspectivePoint {
  axis: PerspectiveAxis;
  leftLabel: string;
  rightLabel: string;
  /** 0~100. 이 축에 해당하는 표가 하나도 없으면 null 이다. */
  value: number | null;
  /** 이 축 값을 만든 내 표 수. 근거: docs/PerspectiveSpec.md 3장. */
  voteCount: number;
}

export interface OpinionChange {
  issueId: string;
  before: VoteRecord;
  after: VoteRecord;
  persuadedByClaimId: string;
}
