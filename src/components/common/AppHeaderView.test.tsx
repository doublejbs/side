import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppHeaderView } from '@/components/common/AppHeaderView';

describe('AppHeaderView', () => {
  it('로고만 있으면 액션 영역을 만들지 않는다', () => {
    const { container } = render(<AppHeaderView />);

    expect(screen.getByText('SIDE')).toBeInTheDocument();
    expect(container.querySelector('header')?.children).toHaveLength(1);
  });

  it('액션과 인증 액션을 함께 배치한다', () => {
    render(
      <AppHeaderView
        action={<button type="button">검색</button>}
        authAction={<a href="/login">로그인</a>}
      />,
    );

    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
  });
});
