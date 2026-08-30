import type { VoteCounts } from '@/data/voteAggregation';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';

/**
 * 투표·근거 피드백 쓰기 계층. 라우트 핸들러가 Prisma 에 직접 의존하지 않도록 감싼다.
 * 구현은 `PrismaVoteStore`(DB) / `InMemoryVoteStore`(테스트) 두 벌이다.
 */
export interface VoteStore {
  /** 발행된 이슈의 slug 를 내부 id 로 바꾼다. 없으면 null. */
  getIssueIdBySlug(slug: string): Promise<string | null>;
  /** 1인 1표. 같은 익명 식별자가 다시 투표하면 선택만 바뀐다. */
  castVote(issueId: string, anonId: string, choice: VoteChoice): Promise<void>;
  getMyVote(issueId: string, anonId: string): Promise<VoteChoice | null>;
  countVotes(issueId: string): Promise<VoteCounts>;
  /** `feedback` 이 null 이면 기록을 지운다. */
  setClaimFeedback(claimId: string, anonId: string, feedback: ClaimFeedback | null): Promise<void>;
  getMyClaimFeedback(claimId: string, anonId: string): Promise<ClaimFeedback | null>;
  claimExists(claimId: string): Promise<boolean>;
}
