import { render, screen } from '@testing-library/react';

import { IssueStatus } from '@/domain/IssueStatus';
import type { AdminMergeTarget } from '@/server/AdminStore';

import { IssueMergeFormView } from './IssueMergeFormView';

const noop = async () => {};

const TARGETS: AdminMergeTarget[] = [
  { id: 'target-1', question: '첫 이슈', status: IssueStatus.REVIEW },
  { id: 'target-2', question: '둘째 이슈', status: IssueStatus.PUBLISHED },
];

const renderView = (
  status: IssueStatus,
  duplicateOfIssueId: string | null = null,
  targets: AdminMergeTarget[] = TARGETS,
) =>
  render(
    <IssueMergeFormView
      status={status}
      duplicateOfIssueId={duplicateOfIssueId}
      targets={targets}
      mergeIssueAction={noop}
    />,
  );

describe('IssueMergeFormView', () => {
  it('대상 목록과 안내 문구를 보여준다', () => {
    renderView(IssueStatus.DRAFT);

    expect(screen.getByText('기사만 대상 이슈로 옮기고, 이 이슈는 반려 처리됩니다.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '첫 이슈 (검수 대기)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '둘째 이슈 (발행됨)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이 이슈를 선택한 이슈에 병합' })).toBeEnabled();
  });

  it('중복 후보가 목록에 있으면 기본값으로 고른다', () => {
    renderView(IssueStatus.DRAFT, 'target-2');

    expect(screen.getByRole('combobox')).toHaveValue('target-2');
  });

  it('중복 후보가 목록에 없으면 가장 최근 이슈를 고른다', () => {
    renderView(IssueStatus.DRAFT, 'missing');

    expect(screen.getByRole('combobox')).toHaveValue('target-1');
  });

  it('발행된 이슈는 병합 버튼을 막고 이유를 보여준다', () => {
    renderView(IssueStatus.PUBLISHED);

    const button = screen.getByRole('button', { name: '이 이슈를 선택한 이슈에 병합' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', '발행된 이슈는 먼저 반려해야 병합할 수 있어요');
    expect(screen.getByText('발행된 이슈는 먼저 반려해야 병합할 수 있어요')).toBeInTheDocument();
  });

  it('대상 후보가 없으면 선택 상자 대신 안내만 남긴다', () => {
    renderView(IssueStatus.DRAFT, null, []);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('최근 30일 안에 병합할 수 있는 이슈가 없습니다.')).toBeInTheDocument();
  });
});
