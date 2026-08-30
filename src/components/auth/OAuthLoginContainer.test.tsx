import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthLoginContainer } from '@/components/auth/OAuthLoginContainer';
import { AuthProvider } from '@/domain/AuthProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/createBrowserSupabaseClient';

vi.mock('@/lib/supabase/createBrowserSupabaseClient', () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

const createClientMock = vi.mocked(createBrowserSupabaseClient);

const signInWithOAuth = vi.fn();

/** 테스트에서는 Supabase 클라이언트 전체가 필요하지 않아 쓰는 메서드만 흉내 낸다. */
const buildFakeClient = () =>
  ({ auth: { signInWithOAuth } }) as unknown as ReturnType<typeof createBrowserSupabaseClient>;

const LOGIN_ERROR_MESSAGE = '로그인에 실패했어요. 다시 시도해 주세요.';

beforeEach(() => {
  createClientMock.mockReset();
  signInWithOAuth.mockReset();
  signInWithOAuth.mockResolvedValue({ data: {}, error: null });
  createClientMock.mockReturnValue(buildFakeClient());
});

describe('OAuthLoginContainer', () => {
  it('공급자 버튼 2개를 보여준다', () => {
    render(<OAuthLoginContainer next="/me" />);

    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오로 계속하기' })).toBeInTheDocument();
  });

  it('Google 버튼은 next 를 붙인 콜백 주소로 로그인을 시작한다', async () => {
    const user = userEvent.setup();

    render(<OAuthLoginContainer next="/issues/work-week-4-5#vote" />);

    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: AuthProvider.GOOGLE,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            '/issues/work-week-4-5#vote',
          )}`,
        },
      });
    });
  });

  it('카카오 버튼은 카카오 공급자로 로그인을 시작한다', async () => {
    const user = userEvent.setup();

    render(<OAuthLoginContainer next="/" />);

    await user.click(screen.getByRole('button', { name: '카카오로 계속하기' }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: AuthProvider.KAKAO,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=%2F` },
      });
    });
  });

  it('로그인 시작이 실패하면 안내 문구를 보여준다', async () => {
    const user = userEvent.setup();

    signInWithOAuth.mockResolvedValue({ data: {}, error: new Error('boom') });

    render(<OAuthLoginContainer next="/" />);

    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(LOGIN_ERROR_MESSAGE);
    });
  });

  it('클라이언트를 만들 수 없으면 안내 문구를 보여준다', async () => {
    const user = userEvent.setup();

    createClientMock.mockReturnValue(null);

    render(<OAuthLoginContainer next="/" />);

    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(LOGIN_ERROR_MESSAGE);
    });
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it('로그인을 시작하면 두 버튼을 모두 비활성화해 연타를 막는다', async () => {
    const user = userEvent.setup();

    render(<OAuthLoginContainer next="/" />);

    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: '카카오로 계속하기' })).toBeDisabled();
  });

  it('시작에 실패하면 다시 누를 수 있게 되돌린다', async () => {
    const user = userEvent.setup();

    signInWithOAuth.mockResolvedValue({ data: {}, error: new Error('boom') });

    render(<OAuthLoginContainer next="/" />);

    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeEnabled();
    });
  });

  it('콜백 오류를 받으면 안내 문구를 보여준다', () => {
    render(<OAuthLoginContainer next="/" hasCallbackError />);

    expect(screen.getByRole('alert')).toHaveTextContent(LOGIN_ERROR_MESSAGE);
  });

  it('콜백 오류와 시작 오류가 함께여도 안내는 하나만 보여준다', async () => {
    const user = userEvent.setup();

    signInWithOAuth.mockResolvedValue({ data: {}, error: new Error('boom') });

    render(<OAuthLoginContainer next="/" hasCallbackError />);

    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeEnabled();
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
