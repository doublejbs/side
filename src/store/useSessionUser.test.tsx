import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '@/domain/SessionUser';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { resetSession } from '@/store/SessionCache';
import { useSessionUser } from '@/store/useSessionUser';

vi.mock('@/lib/auth/isAuthEnabled', () => ({ isAuthEnabled: vi.fn() }));

const isAuthEnabledMock = vi.mocked(isAuthEnabled);

const fetchMock = vi.fn();

const USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

const jsonResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => {
  resetSession();
  isAuthEnabledMock.mockReset().mockReturnValue(true);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useSessionUser', () => {
  it('로그인이 꺼져 있으면 요청 없이 비로그인으로 확정한다', () => {
    isAuthEnabledMock.mockReturnValue(false);

    const { result } = renderHook(() => useSessionUser());

    expect(result.current).toEqual({ user: null, isLoaded: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('마운트하면 /api/session 을 캐시 없이 한 번 부른다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(USER));

    const { result } = renderHook(() => useSessionUser());

    expect(result.current).toEqual({ user: null, isLoaded: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/session', { cache: 'no-store' });

    await waitFor(() => {
      expect(result.current).toEqual({ user: USER, isLoaded: true });
    });
  });

  it('비로그인 응답(null)이면 로드 완료 상태로 비로그인을 알린다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null));

    const { result } = renderHook(() => useSessionUser());

    await waitFor(() => {
      expect(result.current).toEqual({ user: null, isLoaded: true });
    });
  });

  it('요청이 실패해도 비로그인으로 다룬다', async () => {
    fetchMock.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useSessionUser());

    await waitFor(() => {
      expect(result.current).toEqual({ user: null, isLoaded: true });
    });
  });

  it('응답 상태가 실패면 비로그인으로 다룬다', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);

    const { result } = renderHook(() => useSessionUser());

    await waitFor(() => {
      expect(result.current).toEqual({ user: null, isLoaded: true });
    });
  });

  it('여러 컴포넌트가 써도 요청은 한 번만 나간다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(USER));

    renderHook(() => useSessionUser());
    renderHook(() => useSessionUser());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
