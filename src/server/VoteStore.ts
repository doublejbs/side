import type { VoteCounts } from '@/data/voteAggregation';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { IssueAxis } from '@/domain/IssueAxis';
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

/**
 * `listMyVoteEvents` 가 돌려주는 투표 이력 한 건. 발행된 이슈의 이벤트만 담기지만,
 * 발행 상태인데도 slug·질문이 비어 있을 수 있으므로 null 을 허용한다.
 */
export interface MyVoteEventRow {
  issueId: string;
  issueSlug: string | null;
  question: string | null;
  choice: VoteChoice;
  /** ISO 8601 */
  createdAt: string;
}

/** 내가 '설득됐어요' 를 남긴 주장 한 건. 의견 변화에 붙일 제목만 담는다. */
export interface MyPersuadedClaimRow {
  issueId: string;
  claimTitle: string;
}

/** 관점 계산에 필요한 내 표 한 건. 이슈의 축 메타데이터와 선택만 담는다. */
export interface MyVoteAxesRow {
  axes: IssueAxis[];
  choice: VoteChoice;
}

/**
 * `listMyVoteEvents` 가 한 번에 읽는 이력 수 상한.
 * 화면은 최근 변화 몇 건만 쓰므로(`MAX_OPINION_CHANGES`) 오래 쓴 계정의 이력을 전부 읽지 않는다.
 */
export const MAX_MY_VOTE_EVENTS = 200;

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
  /**
   * 1인 1표. 같은 사용자가 다시 투표하면 선택만 바뀐다.
   * 신규이거나 선택이 바뀐 경우에만 `VoteEvent` 이력을 남긴다(같은 선택 재클릭은 기록하지 않는다).
   * 근거: docs/PerspectiveSpec.md 2장.
   */
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
  /**
   * 한 사용자의 투표 이력. 발행된 이슈만, 오래된 순(`createdAt` 오름차순)이다.
   * 최근 `MAX_MY_VOTE_EVENTS` 건까지만 읽고 그 안에서 오름차순으로 돌려준다.
   * "나" 탭의 의견 변화가 같은 이슈의 연속 이벤트를 짝지어 쓴다.
   * 근거: docs/PerspectiveSpec.md 4장.
   */
  listMyVoteEvents(userId: string): Promise<MyVoteEventRow[]>;
  /** 내가 '설득됐어요' 를 남긴 주장. 먼저 남긴 순서다. */
  listMyPersuadedClaims(userId: string): Promise<MyPersuadedClaimRow[]>;
  /** 내가 남긴 근거 피드백 수(판정 종류를 가리지 않는다). */
  countMyClaimFeedbacks(userId: string): Promise<number>;
  /** 관점 축 계산의 입력. 발행된 이슈의 내 최신 표만 돌려준다. */
  listMyVoteAxes(userId: string): Promise<MyVoteAxesRow[]>;
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
