import { render, screen } from '@testing-library/react';

import type { AdminIssueListItem } from '@/server/AdminStore';

import { IssueReviewListView } from './IssueReviewListView';

const createItem = (overrides: Partial<AdminIssueListItem> = {}): AdminIssueListItem => ({
  id: 'issue-1',
  question: '정년을 연장해야 할까?',
  articleCount: 12,
  claimCount: 6,
  createdAt: new Date('2026-01-05T00:00:00.000Z'),
  hasWarning: false,
  ...overrides,
});

describe('IssueReviewListView', () => {
  it('질문 링크와 기사·주장 수, 생성일을 보여준다', () => {
    render(<IssueReviewListView issues={[createItem()]} />);

    expect(screen.getByRole('link', { name: '정년을 연장해야 할까?' })).toHaveAttribute(
      'href',
      '/admin/issues/issue-1',
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('2026.01.05')).toBeInTheDocument();
  });

  it('검수 메모가 있으면 경고 배지를 붙인다', () => {
    render(<IssueReviewListView issues={[createItem({ hasWarning: true })]} />);

    expect(screen.getByText('검수 경고')).toBeInTheDocument();
  });

  it('비어 있으면 안내 문구를 보여준다', () => {
    render(<IssueReviewListView issues={[]} />);

    expect(screen.getByText('이 상태의 이슈가 없습니다.')).toBeInTheDocument();
  });
});
