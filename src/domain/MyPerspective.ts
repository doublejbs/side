import type { PerspectivePoint } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';

/**
 * 같은 이슈에서 선택을 바꾼 기록 한 건. 최신순으로 내려간다.
 * 근거: docs/PerspectiveSpec.md 4장.
 */
export interface MyOpinionChange {
  slug: string;
  question: string;
  before: VoteChoice;
  /** ISO 8601 */
  beforeAt: string;
  after: VoteChoice;
  /** ISO 8601 */
  afterAt: string;
  /** 그 이슈에서 내가 '설득됐어요' 를 남긴 첫 주장 제목. 없으면 null. */
  persuadedClaimTitle: string | null;
}

/** `GET /api/me/perspective` 응답. 서버는 계산만 하고 저장하지 않는다. */
export interface MyPerspectiveResponse {
  /** 축 5개 전부. 표가 없는 축은 `value` 가 null 이다. */
  points: PerspectivePoint[];
  changes: MyOpinionChange[];
  /** 내가 남긴 근거 피드백 수. */
  feedbackCount: number;
}
