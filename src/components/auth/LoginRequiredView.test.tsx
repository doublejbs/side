import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoginRequiredView } from '@/components/auth/LoginRequiredView';

const LOGIN_HREF = '/login?next=%2Fme';

describe('LoginRequiredView', () => {
  it('로그인 안내 문구와 로그인 링크를 보여준다', () => {
    render(<LoginRequiredView loginHref={LOGIN_HREF} />);

    expect(screen.getByText('로그인하면 투표 기록과 생각의 변화를 볼 수 있어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', LOGIN_HREF);
  });
});
