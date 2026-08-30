import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountCardView } from '@/components/auth/AccountCardView';
import type { SessionUser } from '@/domain/SessionUser';

const buildUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
  ...overrides,
});

describe('AccountCardView', () => {
  it('이름과 이메일을 보여준다', () => {
    render(<AccountCardView user={buildUser()} />);

    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('someone@example.com')).toBeInTheDocument();
  });

  it('로그아웃 버튼은 POST /auth/signout 폼을 제출한다', () => {
    render(<AccountCardView user={buildUser()} />);

    const button = screen.getByRole('button', { name: '로그아웃' });

    expect(button).toHaveAttribute('type', 'submit');
    expect(button.closest('form')).toHaveAttribute('action', '/auth/signout');
    expect(button.closest('form')).toHaveAttribute('method', 'post');
  });

  it('이름이 없으면 대체 문구를 보여준다', () => {
    render(<AccountCardView user={buildUser({ name: null })} />);

    expect(screen.getByText('이름 없음')).toBeInTheDocument();
  });
});
