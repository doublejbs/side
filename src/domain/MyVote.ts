import { VoteChoice } from '@/domain/VoteChoice';

/**
 * 내가 던진 표 한 건. 서버가 `userId` 로 집계해 돌려준다(`GET /api/me/votes`).
 * 화면은 slug 로만 이슈를 가리키므로 아직 발행되지 않은 이슈의 표는 목록에 담지 않는다.
 * 근거: docs/AuthSpec.md 4.4.
 */
export interface MyVote {
  slug: string;
  choice: VoteChoice;
  /** ISO 8601 — 마지막으로 선택을 바꾼 시각. */
  votedAt: string;
}
