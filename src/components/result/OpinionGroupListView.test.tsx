import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { OpinionGroupListView } from '@/components/result/OpinionGroupListView';
import { MOCK_ISSUES } from '@/data/MockIssueRepository';
import { toIssueResultSummary } from '@/domain/IssueResultSummary';

const issue = toIssueResultSummary(MOCK_ISSUES[0]);

const renderView = () =>
  render(<OpinionGroupListView groups={issue.opinionGroups} claims={issue.claims} />);

const findClaimTitle = (claimId: string): string => {
  const claim = issue.claims.find((candidate) => candidate.id === claimId);

  if (!claim) {
    throw new Error(`claim not found: ${claimId}`);
  }

  return claim.title;
};

/** 상세 영역은 항상 렌더되고 hidden 으로만 토글되므로 aria-controls 로 찾는다. */
const getDetailOf = (button: HTMLElement): HTMLElement => {
  const detailId = button.getAttribute('aria-controls');
  const detail = detailId ? document.getElementById(detailId) : null;

  if (!detail) {
    throw new Error('그룹 상세 영역을 찾을 수 없습니다.');
  }

  return detail;
};

describe('OpinionGroupListView', () => {
  it('그룹 3개의 라벨·비율·설명을 보여준다', () => {
    renderView();

    expect(screen.getByRole('heading', { name: '비슷한 생각을 가진 사람들' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);

    issue.opinionGroups.forEach((group) => {
      expect(screen.getByText(group.label)).toBeInTheDocument();
      expect(screen.getByText(`${group.share}%`)).toBeInTheDocument();
      expect(screen.getByText(group.description)).toBeInTheDocument();
    });
  });

  it('첫 번째 그룹에만 "나와 가장 가까움" 배지를 보여준다', () => {
    renderView();

    const badges = screen.getAllByText('나와 가장 가까움');
    const buttons = screen.getAllByRole('button');

    expect(badges).toHaveLength(1);
    expect(buttons[0]).toContainElement(badges[0]);
  });

  it('그룹을 클릭하면 동의·반대·의견이 갈리는 주장을 펼친다', async () => {
    const user = userEvent.setup();

    renderView();

    const [firstGroupButton] = screen.getAllByRole('button');
    const detail = getDetailOf(firstGroupButton);
    const group = issue.opinionGroups[0];

    expect(firstGroupButton).toHaveAttribute('aria-expanded', 'false');
    expect(detail).not.toBeVisible();

    await user.click(firstGroupButton);

    expect(firstGroupButton).toHaveAttribute('aria-expanded', 'true');
    expect(detail).toBeVisible();
    expect(within(detail).getByText('이 그룹이 동의하는 주장')).toBeInTheDocument();
    expect(within(detail).getByText('이 그룹이 반대하는 주장')).toBeInTheDocument();
    expect(within(detail).getByText('가장 의견이 갈리는 주장')).toBeInTheDocument();

    [...group.agreesWith, ...group.disagreesWith, ...group.mostDivided].forEach((claimId) => {
      expect(within(detail).getByText(findClaimTitle(claimId))).toBeInTheDocument();
    });
  });

  it('펼친 그룹을 다시 클릭하면 접는다', async () => {
    const user = userEvent.setup();

    renderView();

    const [firstGroupButton] = screen.getAllByRole('button');
    const detail = getDetailOf(firstGroupButton);

    await user.click(firstGroupButton);
    await user.click(firstGroupButton);

    expect(firstGroupButton).toHaveAttribute('aria-expanded', 'false');
    expect(detail).not.toBeVisible();
  });

  it('접힌 그룹의 상세 영역도 문서에는 남아 aria-controls 참조가 유지된다', () => {
    renderView();

    screen.getAllByRole('button').forEach((button) => {
      expect(getDetailOf(button)).not.toBeVisible();
    });
  });
});
