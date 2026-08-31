import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyVote } from '@/domain/MyVote';
import type { SessionUser } from '@/domain/SessionUser';
import { VoteChoice } from '@/domain/VoteChoice';
import type { MyVotesResponse, VoteResultResponse } from '@/domain/VoteApiTypes';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { invalidateMyVotes, resetMyVotes } from '@/store/MyVotesCache';
import { resetSession } from '@/store/SessionCache';
import { useMyVotes } from '@/store/useMyVotes';
import { castVoteRequest } from '@/store/VoteApiClient';

vi.mock('@/lib/auth/isAuthEnabled', () => ({ isAuthEnabled: vi.fn() }));

const isAuthEnabledMock = vi.mocked(isAuthEnabled);

const SESSION_PATH = '/api/session';
const MY_VOTES_PATH = '/api/me/votes';
const NEW_SLUG = 'nuclear-expansion';

const USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

const MY_VOTES: MyVote[] = [
  { slug: 'work-week-4-5', choice: VoteChoice.AGREE, votedAt: '2026-08-02T00:00:00.000Z' },
  { slug: 'ai-regulation', choice: VoteChoice.DISAGREE, votedAt: '2026-08-01T00:00:00.000Z' },
];

const NEW_VOTE: MyVote = {
  slug: NEW_SLUG,
  choice: VoteChoice.AGREE,
  votedAt: '2026-08-03T00:00:00.000Z',
};

const VOTE_RESULT: VoteResultResponse = {
  slug: NEW_SLUG,
  distribution: { agree: 100, disagree: 0, unsure: 0 },
  participantCount: 1,
  myChoice: VoteChoice.AGREE,
};

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const myVotesResponse = (votes: MyVote[]): Response =>
  jsonResponse({ votes } satisfies MyVotesResponse);

const fetchMock = vi.fn();

/** 세션 응답과 내 투표 응답을 경로로 갈라 주는 fetch 대역. */
const stubFetch = (sessionUser: SessionUser | null, response: Response): void => {
  fetchMock.mockImplementation(async (path: string) =>
    path === SESSION_PATH ? jsonResponse(sessionUser) : response,
  );
};

const countCalls = (path: string): number =>
  fetchMock.mock.calls.filter((call) => call[0] === path).length;

/** 대기 중인 then/catch 체인을 흘려보낸다. 늦게 도착한 응답이 처리됐는지 보려면 필요하다. */
const flushPending = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  resetSession();
  resetMyVotes();
  isAuthEnabledMock.mockReset().mockReturnValue(true);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMyVotes', () => {
  it('목 모드면 요청 없이 빈 집계로 확정한다', () => {
    stubFetch(USER, myVotesResponse(MY_VOTES));

    const { result } = renderHook(() => useMyVotes(false));

    expect(result.current).toEqual({ votes: null, isLoaded: true });
    expect(countCalls(MY_VOTES_PATH)).toBe(0);
  });

  it('로그인이 꺼져 있으면 요청 없이 빈 집계로 확정한다', () => {
    isAuthEnabledMock.mockReturnValue(false);

    const { result } = renderHook(() => useMyVotes(true));

    expect(result.current).toEqual({ votes: null, isLoaded: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('세션 판정 전에는 아직 로드되지 않은 상태다', () => {
    stubFetch(USER, myVotesResponse(MY_VOTES));

    const { result } = renderHook(() => useMyVotes(true));

    expect(result.current).toEqual({ votes: null, isLoaded: false });
    expect(countCalls(MY_VOTES_PATH)).toBe(0);
  });

  it('비로그인이면 내 투표를 요청하지 않는다', async () => {
    stubFetch(null, myVotesResponse(MY_VOTES));

    const { result } = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(result.current).toEqual({ votes: null, isLoaded: true });
    });
    expect(countCalls(MY_VOTES_PATH)).toBe(0);
  });

  it('로그인이 확인되면 내 투표 목록을 캐시 없이 받아온다', async () => {
    stubFetch(USER, myVotesResponse(MY_VOTES));

    const { result } = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(result.current).toEqual({ votes: MY_VOTES, isLoaded: true });
    });
    expect(fetchMock).toHaveBeenCalledWith(MY_VOTES_PATH, { cache: 'no-store' });
  });

  it('여러 컴포넌트가 써도 요청은 한 번만 나간다', async () => {
    stubFetch(USER, myVotesResponse(MY_VOTES));

    renderHook(() => useMyVotes(true));
    renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(countCalls(MY_VOTES_PATH)).toBe(1);
    });
  });
});

describe('useMyVotes 실패 처리', () => {
  it('401 이면 비로그인으로 확정하고 다시 시도하지 않는다', async () => {
    stubFetch(USER, jsonResponse({ error: 'LOGIN_REQUIRED' }, 401));

    const first = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(first.result.current).toEqual({ votes: null, isLoaded: true });
    });

    first.unmount();
    renderHook(() => useMyVotes(true));

    // 세션 캐시도 함께 비웠으므로 세션은 다시 확인하지만, 내 투표는 다시 묻지 않는다.
    await waitFor(() => {
      expect(countCalls(SESSION_PATH)).toBe(2);
    });
    expect(countCalls(MY_VOTES_PATH)).toBe(1);
  });

  it('서버 오류면 로드를 확정하되 다음 마운트에서 다시 시도한다', async () => {
    stubFetch(USER, jsonResponse({ error: 'boom' }, 500));

    const first = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(first.result.current).toEqual({ votes: null, isLoaded: true });
    });
    expect(countCalls(MY_VOTES_PATH)).toBe(1);

    first.unmount();
    stubFetch(USER, myVotesResponse(MY_VOTES));

    const second = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(second.result.current).toEqual({ votes: MY_VOTES, isLoaded: true });
    });
    expect(countCalls(MY_VOTES_PATH)).toBe(2);
  });

  it('요청이 실패해도 이미 받아 둔 목록은 지우지 않는다', async () => {
    stubFetch(USER, myVotesResponse(MY_VOTES));

    const first = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(first.result.current.votes).toEqual(MY_VOTES);
    });

    first.unmount();
    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      throw new Error('network');
    });
    invalidateMyVotes();

    const second = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(countCalls(MY_VOTES_PATH)).toBe(2);
    });
    expect(second.result.current).toEqual({ votes: MY_VOTES, isLoaded: true });
  });

  it('받아 둔 목록이 없는 채로 실패하면 집계 없이 로드 완료로 다룬다', async () => {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      throw new Error('network');
    });

    const { result } = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(result.current).toEqual({ votes: null, isLoaded: true });
    });
  });

  it('늦게 도착한 옛 응답은 버린다', async () => {
    const resolvers: ((response: Response) => void)[] = [];

    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      return new Promise<Response>((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { result } = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(resolvers).toHaveLength(1);
    });

    // 구독자가 붙어 있으므로 무효화가 두 번째 요청을 바로 띄운다.
    act(() => {
      invalidateMyVotes();
    });

    await waitFor(() => {
      expect(resolvers).toHaveLength(2);
    });

    resolvers[1](myVotesResponse(MY_VOTES));
    await flushPending();

    expect(result.current.votes).toEqual(MY_VOTES);

    resolvers[0](myVotesResponse([]));
    await flushPending();

    expect(result.current.votes).toEqual(MY_VOTES);
  });
});

describe('useMyVotes 캐시 무효화', () => {
  it('구독자가 없으면 다음 마운트에서 다시 받아온다', async () => {
    stubFetch(USER, myVotesResponse(MY_VOTES));

    const first = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(first.result.current.votes).toEqual(MY_VOTES);
    });

    first.unmount();
    invalidateMyVotes();

    expect(countCalls(MY_VOTES_PATH)).toBe(1);

    renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(countCalls(MY_VOTES_PATH)).toBe(2);
    });
  });

  it('투표가 저장되면 화면에 붙어 있는 목록이 바로 늘어난다', async () => {
    let listResponse = myVotesResponse(MY_VOTES);

    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      if (path === MY_VOTES_PATH) {
        return listResponse;
      }

      return jsonResponse(VOTE_RESULT);
    });

    const { result } = renderHook(() => useMyVotes(true));

    await waitFor(() => {
      expect(result.current.votes).toHaveLength(MY_VOTES.length);
    });

    listResponse = myVotesResponse([NEW_VOTE, ...MY_VOTES]);

    await act(async () => {
      await castVoteRequest(NEW_SLUG, VoteChoice.AGREE);
    });

    await waitFor(() => {
      expect(result.current.votes).toHaveLength(MY_VOTES.length + 1);
    });
  });
});
