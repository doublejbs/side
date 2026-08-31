import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyVote } from '@/domain/MyVote';
import type { SessionUser } from '@/domain/SessionUser';
import { VoteChoice } from '@/domain/VoteChoice';
import type { MyVotesResponse } from '@/domain/VoteApiTypes';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { invalidateMyVotes, resetMyVotes } from '@/store/MyVotesCache';
import { resetSession } from '@/store/SessionCache';
import { useMyVotes } from '@/store/useMyVotes';

vi.mock('@/lib/auth/isAuthEnabled', () => ({ isAuthEnabled: vi.fn() }));

const isAuthEnabledMock = vi.mocked(isAuthEnabled);

const SESSION_PATH = '/api/session';
const MY_VOTES_PATH = '/api/me/votes';

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

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const fetchMock = vi.fn();

/** 세션 응답과 내 투표 응답을 경로로 갈라 주는 fetch 대역. */
const stubFetch = (sessionUser: SessionUser | null, myVotesResponse: Response): void => {
  fetchMock.mockImplementation(async (path: string) =>
    path === SESSION_PATH ? jsonResponse(sessionUser) : myVotesResponse,
  );
};

const countCalls = (path: string): number =>
  fetchMock.mock.calls.filter((call) => call[0] === path).length;

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
  it('로그인이 꺼져 있으면 요청 없이 빈 집계로 확정한다', () => {
    isAuthEnabledMock.mockReturnValue(false);

    const { result } = renderHook(() => useMyVotes());

    expect(result.current).toEqual({ votes: null, isLoaded: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('세션 판정 전에는 아직 로드되지 않은 상태다', () => {
    stubFetch(USER, jsonResponse({ votes: MY_VOTES } satisfies MyVotesResponse));

    const { result } = renderHook(() => useMyVotes());

    expect(result.current).toEqual({ votes: null, isLoaded: false });
    expect(countCalls(MY_VOTES_PATH)).toBe(0);
  });

  it('비로그인이면 내 투표를 요청하지 않는다', async () => {
    stubFetch(null, jsonResponse({ votes: MY_VOTES } satisfies MyVotesResponse));

    const { result } = renderHook(() => useMyVotes());

    await waitFor(() => {
      expect(result.current).toEqual({ votes: null, isLoaded: true });
    });
    expect(countCalls(MY_VOTES_PATH)).toBe(0);
  });

  it('로그인이 확인되면 내 투표 목록을 캐시 없이 받아온다', async () => {
    stubFetch(USER, jsonResponse({ votes: MY_VOTES } satisfies MyVotesResponse));

    const { result } = renderHook(() => useMyVotes());

    await waitFor(() => {
      expect(result.current).toEqual({ votes: MY_VOTES, isLoaded: true });
    });
    expect(fetchMock).toHaveBeenCalledWith(MY_VOTES_PATH, { cache: 'no-store' });
  });

  it('401 이면 집계 없이 로드 완료로 다룬다', async () => {
    stubFetch(USER, jsonResponse({ error: 'LOGIN_REQUIRED' }, 401));

    const { result } = renderHook(() => useMyVotes());

    await waitFor(() => {
      expect(result.current).toEqual({ votes: null, isLoaded: true });
    });
  });

  it('요청이 실패해도 집계 없이 로드 완료로 다룬다', async () => {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === SESSION_PATH) {
        return jsonResponse(USER);
      }

      throw new Error('network');
    });

    const { result } = renderHook(() => useMyVotes());

    await waitFor(() => {
      expect(result.current).toEqual({ votes: null, isLoaded: true });
    });
  });

  it('여러 컴포넌트가 써도 요청은 한 번만 나간다', async () => {
    stubFetch(USER, jsonResponse({ votes: MY_VOTES } satisfies MyVotesResponse));

    renderHook(() => useMyVotes());
    renderHook(() => useMyVotes());

    await waitFor(() => {
      expect(countCalls(MY_VOTES_PATH)).toBe(1);
    });
  });

  it('캐시를 무효화하면 다음 조회에서 다시 받아온다', async () => {
    stubFetch(USER, jsonResponse({ votes: MY_VOTES } satisfies MyVotesResponse));

    const first = renderHook(() => useMyVotes());

    await waitFor(() => {
      expect(first.result.current.votes).toEqual(MY_VOTES);
    });

    first.unmount();
    invalidateMyVotes();
    renderHook(() => useMyVotes());

    await waitFor(() => {
      expect(countCalls(MY_VOTES_PATH)).toBe(2);
    });
  });
});
