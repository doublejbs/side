import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LegalSection } from '@/components/legal/LegalSection';
import { LegalPageView } from '@/components/legal/LegalPageView';

const SECTIONS: LegalSection[] = [
  {
    heading: '제1조 (목적)',
    paragraphs: ['첫 번째 조항의 본문입니다.', '같은 조항의 두 번째 문단입니다.'],
  },
  {
    heading: '제2조 (수집 항목)',
    paragraphs: ['아래 정보를 수집합니다.'],
    items: ['소셜 로그인 식별자', '투표 선택 기록'],
  },
];

const renderView = () =>
  render(<LegalPageView title="테스트 문서" updatedAt="2026년 8월 31일" sections={SECTIONS} />);

describe('LegalPageView', () => {
  it('문서 제목을 제목 요소로 보여준다', () => {
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: '테스트 문서' })).toBeInTheDocument();
  });

  it('시행일을 보여준다', () => {
    renderView();

    expect(screen.getByText('시행일 2026년 8월 31일')).toBeInTheDocument();
  });

  it('섹션 제목을 2단계 제목으로 보여준다', () => {
    renderView();

    const headings = screen.getAllByRole('heading', { level: 2 });

    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent('제1조 (목적)');
    expect(headings[1]).toHaveTextContent('제2조 (수집 항목)');
  });

  it('섹션의 모든 문단을 보여준다', () => {
    renderView();

    expect(screen.getByText('첫 번째 조항의 본문입니다.')).toBeInTheDocument();
    expect(screen.getByText('같은 조항의 두 번째 문단입니다.')).toBeInTheDocument();
    expect(screen.getByText('아래 정보를 수집합니다.')).toBeInTheDocument();
  });

  it('items 가 있는 섹션만 목록으로 보여준다', () => {
    renderView();

    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('소셜 로그인 식별자');
    expect(items[1]).toHaveTextContent('투표 선택 기록');
  });

  it('홈으로 돌아가는 링크를 보여준다', () => {
    renderView();

    expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
  });
});
