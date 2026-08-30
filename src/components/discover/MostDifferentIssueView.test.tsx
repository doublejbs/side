import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MostDifferentIssueView } from '@/components/discover/MostDifferentIssueView';
import type { IssueSummary } from '@/domain/IssueSummary';
import { VoteChoice } from '@/domain/VoteChoice';

const LOGIN_HREF = '/login?next=%2Fdiscover';

const ISSUE: IssueSummary = {
  slug: 'work-week-4-5',
  question: '주 4.5일제를 도입해야 할까요?',
  participantCount: 100,
  distribution: { agree: 50, disagree: 40, unsure: 10 },
  tags: ['노동'],
};

describe('MostDifferentIssueView', () => {
  it('비로그인이면 안내 문구와 로그인 링크를 보여준다', () => {
    render(<MostDifferentIssueView issue={ISSUE} myChoice={VoteChoice.AGREE} loginHref={LOGIN_HREF} />);

    expect(
      screen.getByText('로그인하면 내 투표를 기준으로 가장 다른 여론을 보여드릴게요.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인하기/ })).toHaveAttribute('href', LOGIN_HREF);
    expect(screen.queryByText(/내 선택/)).not.toBeInTheDocument();
  });

  it('로그인 상태면 내 선택과 전체 여론을 보여준다', () => {
    render(<MostDifferentIssueView issue={ISSUE} myChoice={VoteChoice.AGREE} />);

    expect(screen.getByText('내 선택 · 찬성')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /로그인하기/ })).not.toBeInTheDocument();
  });

  it('투표 기록이 없으면 기존 빈 상태 안내를 보여준다', () => {
    render(<MostDifferentIssueView issue={null} myChoice={null} />);

    expect(screen.getByRole('link', { name: /이슈 보러 가기/ })).toHaveAttribute('href', '/');
  });
});
