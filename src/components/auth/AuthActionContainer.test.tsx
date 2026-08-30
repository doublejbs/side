import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthActionContainer } from '@/components/auth/AuthActionContainer';
import type { SessionUser } from '@/domain/SessionUser';
import { useSessionUser } from '@/store/useSessionUser';

vi.mock('@/store/useSessionUser', () => ({ useSessionUser: vi.fn() }));

const useSessionUserMock = vi.mocked(useSessionUser);

const LOGIN_HREF = '/login?next=%2F';

const USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

beforeEach(() => {
  useSessionUserMock.mockReset();
});

describe('AuthActionContainer', () => {
  it('세션을 받아오기 전에는 자리만 잡는다', () => {
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: false });

    const { container } = render(<AuthActionContainer loginHref={LOGIN_HREF} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('비로그인이면 로그인 링크를 보여준다', () => {
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: true });

    render(<AuthActionContainer loginHref={LOGIN_HREF} />);

    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', LOGIN_HREF);
  });

  it('로그인 상태면 프로필 링크를 보여준다', () => {
    useSessionUserMock.mockReturnValue({ user: USER, isLoaded: true });

    render(<AuthActionContainer loginHref={LOGIN_HREF} />);

    expect(screen.getByRole('link', { name: '홍길동 프로필 보기' })).toHaveAttribute('href', '/me');
  });
});
