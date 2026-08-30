import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthActionView } from '@/components/auth/AuthActionView';
import type { SessionUser } from '@/domain/SessionUser';

const LOGIN_HREF = '/login?next=%2F';

const buildUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
  ...overrides,
});

describe('AuthActionView', () => {
  it('비로그인이면 로그인 링크를 보여준다', () => {
    render(<AuthActionView user={null} loginHref={LOGIN_HREF} />);

    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', LOGIN_HREF);
  });

  it('로그인 상태면 나 탭으로 가는 프로필 링크를 보여준다', () => {
    render(<AuthActionView user={buildUser()} loginHref={LOGIN_HREF} />);

    expect(screen.getByRole('link', { name: '홍길동 프로필 보기' })).toHaveAttribute('href', '/me');
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
  });

  it('아바타가 없으면 이름 이니셜을 보여준다', () => {
    render(<AuthActionView user={buildUser()} loginHref={LOGIN_HREF} />);

    expect(screen.getByText('홍')).toBeInTheDocument();
  });

  it('아바타가 있으면 이미지를 보여준다', () => {
    render(
      <AuthActionView
        user={buildUser({ avatarUrl: 'https://example.com/a.png' })}
        loginHref={LOGIN_HREF}
      />,
    );

    expect(screen.queryByText('홍')).not.toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://example.com/a.png');
  });
});
