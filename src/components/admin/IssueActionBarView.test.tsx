import { render, screen } from '@testing-library/react';

import { IssueStatus } from '@/domain/IssueStatus';

import { IssueActionBarView } from './IssueActionBarView';

const noop = async () => {};

const renderBar = (status: IssueStatus) =>
  render(
    <IssueActionBarView
      status={status}
      publishIssueAction={noop}
      rejectIssueAction={noop}
      regenerateIssueAction={noop}
    />,
  );

describe('IssueActionBarView', () => {
  it('초안·검수 대기에서는 다시 생성을 누를 수 있다', () => {
    const draft = renderBar(IssueStatus.DRAFT);

    expect(screen.getByRole('button', { name: '요약 다시 생성' })).toBeEnabled();

    draft.unmount();
    renderBar(IssueStatus.REVIEW);

    const button = screen.getByRole('button', { name: '요약 다시 생성' });

    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('title');
    expect(screen.queryByText(/다시 생성할 수 없습니다/)).not.toBeInTheDocument();
  });

  it('발행·반려 상태에서는 다시 생성을 막고 이유를 버튼 옆 문구와 title 로 보여준다', () => {
    const published = renderBar(IssueStatus.PUBLISHED);
    const button = screen.getByRole('button', { name: '요약 다시 생성' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringContaining('다시 생성할 수 없습니다'));
    expect(screen.getByText(/다시 생성할 수 없습니다/)).toBeInTheDocument();

    published.unmount();
    renderBar(IssueStatus.REJECTED);

    expect(screen.getByRole('button', { name: '요약 다시 생성' })).toBeDisabled();
    expect(screen.getByText(/다시 생성할 수 없습니다/)).toBeInTheDocument();
  });
});
