import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TermsPage from './page';

describe('TermsPage', () => {
  it('이용약관 제목을 보여준다', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { level: 1, name: '서비스 이용약관' })).toBeInTheDocument();
  });

  it('시행일을 보여준다', () => {
    render(<TermsPage />);

    expect(screen.getByText('시행일 2026년 8월 31일')).toBeInTheDocument();
  });

  it('정치적 성향 라벨을 만들지 않는다는 원칙을 밝힌다', () => {
    render(<TermsPage />);

    expect(screen.getByText(/정치적 성향 라벨/)).toBeInTheDocument();
  });

  it('특정 정치적 입장을 지지하지 않는다고 밝힌다', () => {
    render(<TermsPage />);

    expect(screen.getByText(/지지하거나 반대하지 않습니다/)).toBeInTheDocument();
  });

  it('준거법이 대한민국 법임을 밝힌다', () => {
    render(<TermsPage />);

    expect(screen.getByText(/대한민국 법을 준거법으로 합니다/)).toBeInTheDocument();
  });

  it('문의 연락처를 보여준다', () => {
    render(<TermsPage />);

    expect(screen.getByText(/doublejbjy@gmail\.com/)).toBeInTheDocument();
  });

  it('홈으로 돌아가는 링크를 보여준다', () => {
    render(<TermsPage />);

    expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
  });
});
