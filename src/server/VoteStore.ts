import type { VoteCounts } from '@/data/voteAggregation';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';

/**
 * `listMyVotes` 가 돌려주는 한 행. 발행된 이슈의 표만 담기지만,
 * 발행 상태인데도 slug 가 비어 있을 수 있으므로 `issueSlug` 는 null 을 허용한다.
 */
export interface MyVoteRow {
  issueSlug: string | null;
  choice: VoteChoice;
  /** ISO 8601 — 마지막으로 선택을 바꾼 시각(`updatedAt`). */
  votedAt: string;
}

/** `claimAnonRecords` 가 계정으로 옮긴 레코드 수. 삭제된 충돌 레코드는 세지 않는다. */
export interface ClaimedAnonRecordCounts {
  votes: number;
  feedbacks: number;
}

/**
 * 투표·근거 피드백 쓰기 계층. 라우트 핸들러가 Prisma 에 직접 의존하지 않도록 감싼다.
 * 구현은 `PrismaVoteStore`(DB) / `InMemoryVoteStore`(테스트) 두 벌이다.
 * 새 표는 항상 `userId`(Supabase auth.users.id)로만 저장한다. 근거: docs/AuthSpec.md 3장.
 */
export interface VoteStore {
  /** 발행된 이슈의 slug 를 내부 id 로 바꾼다. 없으면 null. */
  getIssueIdBySlug(slug: string): Promise<string | null>;
  /** 1인 1표. 같은 사용자가 다시 투표하면 선택만 바뀐다. */
  castVote(issueId: string, userId: string, choice: VoteChoice): Promise<void>;
  getMyVote(issueId: string, userId: string): Promise<VoteChoice | null>;
  /** 여론 집계. 아직 이전되지 않은 익명 표도 함께 센다. */
  countVotes(issueId: string): Promise<VoteCounts>;
  /**
   * 한 사용자의 표 전체. 최근에 바꾼 순서(`updatedAt` 내림차순)다.
   * 화면은 slug 로만 이슈를 가리키므로 **발행된 이슈의 표만** 돌려준다.
   * "나"·"발견" 탭의 내 투표 집계가 이 목록을 쓴다. 근거: docs/AuthSpec.md 4.4.
   */
  listMyVotes(userId: string): Promise<MyVoteRow[]>;
  /** `feedback` 이 null 이면 기록을 지운다. */
  setClaimFeedback(claimId: string, userId: string, feedback: ClaimFeedback | null): Promise<void>;
  getMyClaimFeedback(claimId: string, userId: string): Promise<ClaimFeedback | null>;
  claimExists(claimId: string): Promise<boolean>;
  /**
   * 익명 레코드를 계정으로 이전한다. 같은 이슈·주장에 계정 레코드가 이미 있으면
   * 계정 것을 남기고 익명 레코드는 지운다. 근거: docs/AuthSpec.md 4.3.
   */
  claimAnonRecords(anonId: string, userId: string): Promise<ClaimedAnonRecordCounts>;
}
