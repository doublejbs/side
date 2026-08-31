import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('개인정보처리방침 제목을 보여준다', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeInTheDocument();
  });

  it('시행일을 보여준다', () => {
    render(<PrivacyPage />);

    expect(screen.getByText('시행일 2026년 8월 31일')).toBeInTheDocument();
  });

  it('정치적 성향 라벨을 만들지 않는다는 원칙을 밝힌다', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/정치적 성향 라벨/)).toBeInTheDocument();
  });

  it('문의 연락처를 보여준다', () => {
    render(<PrivacyPage />);

    expect(screen.getAllByText(/doublejbjy@gmail\.com/).length).toBeGreaterThan(0);
  });

  it('처리를 위탁한 사업자를 밝힌다', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/Supabase/)).toBeInTheDocument();
    expect(screen.getByText(/Vercel/)).toBeInTheDocument();
  });

  it('홈으로 돌아가는 링크를 보여준다', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
  });
});
