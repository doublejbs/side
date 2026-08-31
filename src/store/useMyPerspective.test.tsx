import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { MyPerspectiveResponse } from '@/domain/MyPerspective';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import type { SessionUser } from '@/domain/SessionUser';
import { VoteChoice } from '@/domain/VoteChoice';
import type { ClaimFeedbackResponse, VoteResultResponse } from '@/domain/VoteApiTypes';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { resetMyVotes } from '@/store/MyVotesCache';
import { invalidateMyPerspective, resetMyPerspective } from '@/store/PerspectiveCache';
import { resetSession } from '@/store/SessionCache';
import { useMyPerspective } from '@/store/useMyPerspective';
import { castVoteRequest, sendClaimFeedback } from '@/store/VoteApiClient';

vi.mock('@/lib/auth/isAuthEnabled', () => ({ isAuthEnabled: vi.fn() }));

const isAuthEnabledMock = vi.mocked(isAuthEnabled);

const SESSION_PATH = '/api/session';
const PERSPECTIVE_PATH = '/api/me/perspective';
const SLUG = 'nuclear-expansion';

const USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

const PERSPECTIVE: MyPerspectiveResponse = {
  points: [
    {
      axis: PerspectiveAxis.ECONOMY,
      leftLabel: '시장 중심',
      rightLabel: '정부 역할',
      value: 75,
      voteCount: 2,
    },
  ],
  changes: [],
  feedbackCount: 3,
};

const UPDATED_PERSPECTIVE: MyPerspectiveResponse = { ...PERSPECTIVE, feedbackCount: 4 };

const VOTE_RESULT: VoteResultResponse = {
  slug: SLUG,
  distribution: { agree: 100, disagree: 0, unsure: 0 },
  participantCount: 1,
  myChoice: VoteChoice.AGREE,
};

const FEEDBACK_RESULT: ClaimFeedbackResponse = {
  claimId: 'claim-1',
  feedback: ClaimFeedback.PERSUADED,
};

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const fetchMock = vi.fn();

/** 세션 응답과 내 관점 응답을 경로로 갈라 주는 fetch 대역. */
const stubFetch = (sessionUser: SessionUser | null, response: Response): void => {
  fetchMock.mockImplementation(async (path: string) =>
    path === SESSION_PATH ? jsonResponse(sessionUser) : response,
  );
};

const countCalls = (path: string): number =>
  fetchMock.mock.calls.filter((call) => call[0] === path).length;

beforeEach(() => {
  resetSession();
  resetMyVotes();
  resetMyPerspective();
  isAuthEnabledMock.mockReset().mockReturnValue(true);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMyPerspective', () => {
  it('목 모드면 요청 없이 빈 계산으로 확정한다', () => {
    stubFetch(USER, jsonResponse(PERSPECTIVE));

    const { result } = renderHook(() => useMyPerspective(false));

    expect(result.current).toEqual({ perspective: null, isLoaded: true });
    expect(countCalls(PERSPECTIVE_PATH)).toBe(0);
  });

  it('세션 판정 전에는 아직 로드되지 않은 상태다', () => {
    stubFetch(USER, jsonResponse(PERSPECTIVE));

    const { result } = renderHook(() => useMyPerspective(true));

    expect(result.current).toEqual({ perspective: null, isLoaded: false });
    expect(countCalls(PERSPECTIVE_PATH)).toBe(0);
  });

  it('비로그인이면 내 관점을 요청하지 않는다', async () => {
    stubFetch(null, jsonResponse(PERSPECTIVE));

    const { result } = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(result.current).toEqual({ perspective: null, isLoaded: true });
    });
    expect(countCalls(PERSPECTIVE_PATH)).toBe(0);
  });

  it('로그인이 확인되면 내 관점을 캐시 없이 받아온다', async () => {
    stubFetch(USER, jsonResponse(PERSPECTIVE));

    const { result } = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(result.current).toEqual({ perspective: PERSPECTIVE, isLoaded: true });
    });
    expect(fetchMock).toHaveBeenCalledWith(PERSPECTIVE_PATH, { cache: 'no-store' });
  });

  it('여러 컴포넌트가 써도 요청은 한 번만 나간다', async () => {
    stubFetch(USER, jsonResponse(PERSPECTIVE));

    renderHook(() => useMyPerspective(true));
    renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(countCalls(PERSPECTIVE_PATH)).toBe(1);
    });
  });
});

describe('useMyPerspective 실패 처리', () => {
  it('401 이면 비로그인으로 확정하고 다시 시도하지 않는다', async () => {
    stubFetch(USER, jsonResponse({ error: 'LOGIN_REQUIRED' }, 401));

    const first = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(first.result.current).toEqual({ perspective: null, isLoaded: true });
    });

    first.unmount();
    renderHook(() => useMyPerspective(true));

    // 세션 캐시도 함께 비웠으므로 세션은 다시 확인하지만, 내 관점은 다시 묻지 않는다.
    await waitFor(() => {
      expect(countCalls(SESSION_PATH)).toBe(2);
    });
    expect(countCalls(PERSPECTIVE_PATH)).toBe(1);
  });

  it('서버 오류면 로드를 확정하되 다음 마운트에서 다시 시도한다', async () => {
    stubFetch(USER, jsonResponse({ error: 'boom' }, 500));

    const first = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(first.result.current).toEqual({ perspective: null, isLoaded: true });
    });

    first.unmount();
    stubFetch(USER, jsonResponse(PERSPECTIVE));

    const second = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(second.result.current).toEqual({ perspective: PERSPECTIVE, isLoaded: true });
    });
    expect(countCalls(PERSPECTIVE_PATH)).toBe(2);
  });

  it('요청이 실패해도 이미 받아 둔 계산은 지우지 않는다', async () => {
    stubFetch(USER, jsonResponse(PERSPECTIVE));

    const first = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(first.result.current.perspective).toEqual(PERSPECTIVE);
    });

    first.unmount();
    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      throw new Error('network');
    });
    invalidateMyPerspective();

    const second = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(countCalls(PERSPECTIVE_PATH)).toBe(2);
    });
    expect(second.result.current).toEqual({ perspective: PERSPECTIVE, isLoaded: true });
  });
});

describe('useMyPerspective 캐시 무효화', () => {
  it('투표가 저장되면 화면에 붙어 있는 계산이 갱신된다', async () => {
    let perspectiveResponse = jsonResponse(PERSPECTIVE);

    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      if (path === PERSPECTIVE_PATH) {
        return perspectiveResponse;
      }

      return jsonResponse(VOTE_RESULT);
    });

    const { result } = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(result.current.perspective).toEqual(PERSPECTIVE);
    });

    perspectiveResponse = jsonResponse(UPDATED_PERSPECTIVE);

    await act(async () => {
      await castVoteRequest(SLUG, VoteChoice.AGREE);
    });

    await waitFor(() => {
      expect(result.current.perspective).toEqual(UPDATED_PERSPECTIVE);
    });
  });

  it('근거 피드백이 저장되면 화면에 붙어 있는 계산이 갱신된다', async () => {
    let perspectiveResponse = jsonResponse(PERSPECTIVE);

    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      if (path === PERSPECTIVE_PATH) {
        return perspectiveResponse;
      }

      return jsonResponse(FEEDBACK_RESULT);
    });

    const { result } = renderHook(() => useMyPerspective(true));

    await waitFor(() => {
      expect(result.current.perspective).toEqual(PERSPECTIVE);
    });

    perspectiveResponse = jsonResponse(UPDATED_PERSPECTIVE);

    await act(async () => {
      await sendClaimFeedback('claim-1', ClaimFeedback.PERSUADED);
    });

    await waitFor(() => {
      expect(result.current.perspective).toEqual(UPDATED_PERSPECTIVE);
    });
  });
});
