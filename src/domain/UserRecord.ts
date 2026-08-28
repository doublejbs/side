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
  /** 0~100 */
  value: number;
}

export interface OpinionChange {
  issueId: string;
  before: VoteRecord;
  after: VoteRecord;
  persuadedByClaimId: string;
}
