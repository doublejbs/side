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
      restoreIssueAction={noop}
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

  it('자동 제외·반려 상태에서만 복원 버튼을 보여준다', () => {
    const autoRejected = renderBar(IssueStatus.AUTO_REJECTED);

    expect(screen.getByRole('button', { name: '검수 대상으로 복원' })).toBeEnabled();

    autoRejected.unmount();
    const rejected = renderBar(IssueStatus.REJECTED);

    expect(screen.getByRole('button', { name: '검수 대상으로 복원' })).toBeEnabled();

    rejected.unmount();
    renderBar(IssueStatus.REVIEW);

    expect(screen.queryByRole('button', { name: '검수 대상으로 복원' })).not.toBeInTheDocument();
  });

  it('자동 제외 상태에서는 다시 생성을 막고 이유를 보여준다', () => {
    renderBar(IssueStatus.AUTO_REJECTED);

    const button = screen.getByRole('button', { name: '요약 다시 생성' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringContaining('다시 생성할 수 없습니다'));
  });
});
