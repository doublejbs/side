import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotFoundView } from '@/components/common/NotFoundView';

describe('NotFoundView', () => {
  it('찾을 수 없다는 제목을 보여준다', () => {
    render(<NotFoundView />);

    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument();
  });

  it('원인을 알려주는 설명을 보여준다', () => {
    render(<NotFoundView />);

    expect(
      screen.getByText('링크가 잘못되었거나 아직 공개되지 않은 이슈일 수 있어요.'),
    ).toBeInTheDocument();
  });

  it('홈으로 돌아가는 링크를 보여준다', () => {
    render(<NotFoundView />);

    expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
  });
});
