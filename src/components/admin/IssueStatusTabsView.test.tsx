import { render, screen } from '@testing-library/react';

import { IssueStatus } from '@/domain/IssueStatus';

import { IssueStatusTabsView } from './IssueStatusTabsView';

describe('IssueStatusTabsView', () => {
  it('검수 흐름 순서대로 자동 제외 탭까지 보여준다', () => {
    render(<IssueStatusTabsView activeStatus={IssueStatus.REVIEW} />);

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      '검수 대기',
      '초안',
      '자동 제외',
      '발행됨',
      '반려됨',
    ]);
  });

  it('자동 제외 탭은 상태 쿼리로 이동하고 현재 탭을 표시한다', () => {
    render(<IssueStatusTabsView activeStatus={IssueStatus.AUTO_REJECTED} />);

    const tab = screen.getByRole('link', { name: '자동 제외' });

    expect(tab).toHaveAttribute('href', '/admin?status=AUTO_REJECTED');
    expect(tab).toHaveAttribute('aria-current', 'page');
  });
});
