import { render, screen } from '@testing-library/react';

import { TabBarView } from './TabBarView';

const usePathnameMock = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('TabBarView', () => {
  it('일반 경로에서는 탭 3개를 렌더하고 현재 탭을 표시한다', () => {
    usePathnameMock.mockReturnValue('/discover');

    render(<TabBarView />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: '발견' })).toHaveAttribute('aria-current', 'page');
  });

  it('이슈 상세 경로에서는 이슈 탭이 활성화된다', () => {
    usePathnameMock.mockReturnValue('/issues/work-week-4-5');

    render(<TabBarView />);

    expect(screen.getByRole('link', { name: '이슈' })).toHaveAttribute('aria-current', 'page');
  });

  it('관리자 경로에서는 렌더하지 않는다', () => {
    usePathnameMock.mockReturnValue('/admin/issues/abc');

    const { container } = render(<TabBarView />);

    expect(container).toBeEmptyDOMElement();
  });
});
