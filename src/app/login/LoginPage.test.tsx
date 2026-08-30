import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { createBrowserSupabaseClient } from '@/lib/supabase/createBrowserSupabaseClient';
import { getSessionUser } from '@/lib/supabase/getSessionUser';

import LoginPage from './page';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth/isAuthEnabled', () => ({ isAuthEnabled: vi.fn() }));
vi.mock('@/lib/supabase/getSessionUser', () => ({ getSessionUser: vi.fn() }));
vi.mock('@/lib/supabase/createBrowserSupabaseClient', () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

const signInWithOAuth = vi.fn();

const renderPage = async (searchParams: { next?: string; error?: string }) => {
  render(await LoginPage({ searchParams: Promise.resolve(searchParams) }));
};

beforeEach(() => {
  vi.mocked(redirect).mockReset();
  vi.mocked(isAuthEnabled).mockReset().mockReturnValue(true);
  vi.mocked(getSessionUser).mockReset().mockResolvedValue(null);
  signInWithOAuth.mockReset().mockResolvedValue({ data: {}, error: null });
  vi.mocked(createBrowserSupabaseClient)
    .mockReset()
    .mockReturnValue({ auth: { signInWithOAuth } } as unknown as ReturnType<
      typeof createBrowserSupabaseClient
    >);
});

describe('LoginPage', () => {
  it('검증한 next 를 콜백 주소에 붙여 넘긴다', async () => {
    const user = userEvent.setup();

    await renderPage({ next: '/me' });
    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=%2Fme` },
      });
    });
  });

  it('외부 URL 은 next 로 쓰지 않고 홈으로 되돌린다', async () => {
    const user = userEvent.setup();

    await renderPage({ next: 'https://evil.example.com' });
    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=%2F` },
      });
    });
  });

  it('error=1 이면 실패 안내를 보여준다', async () => {
    await renderPage({ error: '1' });

    expect(screen.getByRole('alert')).toHaveTextContent('로그인에 실패했어요. 다시 시도해 주세요.');
  });

  it('이미 로그인했으면 next 로 보낸다', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: 'user-1',
      email: null,
      name: null,
      avatarUrl: null,
    });

    await renderPage({ next: '/me' });

    expect(redirect).toHaveBeenCalledWith('/me');
  });

  it('로그인이 설정되지 않았으면 세션을 읽지 않고 안내만 보여준다', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);

    await renderPage({});

    expect(getSessionUser).not.toHaveBeenCalled();
    expect(screen.getByText('로그인이 설정되지 않았습니다')).toBeInTheDocument();
  });
});
