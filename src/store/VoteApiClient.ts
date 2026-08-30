import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import type {
  CastVoteRequest,
  ClaimFeedbackRequest,
  ClaimFeedbackResponse,
  VoteResultResponse,
} from '@/domain/VoteApiTypes';
import { LoginRequiredError } from '@/store/LoginRequiredError';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** 로그인이 필요한 요청을 비로그인으로 보냈을 때 서버가 주는 상태 코드. */
const UNAUTHORIZED_STATUS = 401;

const readJson = async <T>(response: Response): Promise<T> => {
  if (response.status === UNAUTHORIZED_STATUS) {
    throw new LoginRequiredError();
  }

  if (!response.ok) {
    throw new Error(`투표 API 요청이 실패했어요 (${response.status})`);
  }

  return (await response.json()) as T;
};

/** `POST /api/issues/[slug]/votes` — 투표를 서버에 기록하고 갱신된 분포를 받는다. */
export const castVoteRequest = async (
  slug: string,
  choice: VoteChoice,
): Promise<VoteResultResponse> => {
  const body: CastVoteRequest = { choice };
  const response = await fetch(`/api/issues/${encodeURIComponent(slug)}/votes`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  return readJson<VoteResultResponse>(response);
};

/** `GET /api/issues/[slug]/votes/me` — 현재 분포와 내 선택을 받는다. 분포는 캐시하지 않는다. */
export const fetchMyVote = async (slug: string): Promise<VoteResultResponse> => {
  const response = await fetch(`/api/issues/${encodeURIComponent(slug)}/votes/me`, {
    cache: 'no-store',
  });

  return readJson<VoteResultResponse>(response);
};

/** `POST /api/claims/[claimId]/feedback` — null 을 보내면 피드백을 해제한다. */
export const sendClaimFeedback = async (
  claimId: string,
  feedback: ClaimFeedback | null,
): Promise<ClaimFeedbackResponse> => {
  const body: ClaimFeedbackRequest = { feedback };
  const response = await fetch(`/api/claims/${encodeURIComponent(claimId)}/feedback`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  return readJson<ClaimFeedbackResponse>(response);
};
