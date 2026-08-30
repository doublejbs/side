import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { VoteDistribution } from '@/domain/Issue';
import { VoteChoice } from '@/domain/VoteChoice';

/** `GET /api/issues/[slug]/votes/me`, `POST /api/issues/[slug]/votes` 응답. */
export interface VoteResultResponse {
  slug: string;
  distribution: VoteDistribution;
  participantCount: number;
  myChoice: VoteChoice | null;
}

/** `POST /api/issues/[slug]/votes` 요청 본문. */
export interface CastVoteRequest {
  choice: VoteChoice;
}

/** `POST /api/claims/[claimId]/feedback` 응답. */
export interface ClaimFeedbackResponse {
  claimId: string;
  feedback: ClaimFeedback | null;
}

/** `POST /api/claims/[claimId]/feedback` 요청 본문. null 이면 해제한다. */
export interface ClaimFeedbackRequest {
  feedback: ClaimFeedback | null;
}
