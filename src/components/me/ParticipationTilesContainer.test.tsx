import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ParticipationTilesContainer } from '@/components/me/ParticipationTilesContainer';
import type { MyVote } from '@/domain/MyVote';
import { VoteChoice } from '@/domain/VoteChoice';
import { useMyVotes } from '@/store/useMyVotes';
import { setVote } from '@/store/UserRecordStore';

vi.mock('@/store/useMyVotes', () => ({ useMyVotes: vi.fn() }));

const useMyVotesMock = vi.mocked(useMyVotes);

const MY_VOTES: MyVote[] = [
  { slug: 'work-week-4-5', choice: VoteChoice.AGREE, votedAt: '2026-08-02T00:00:00.000Z' },
  { slug: 'ai-regulation', choice: VoteChoice.DISAGREE, votedAt: '2026-08-01T00:00:00.000Z' },
];

const renderContainer = (isServerEnabled: boolean) =>
  render(
    <ParticipationTilesContainer
      feedbackCount={7}
      changedCount={5}
      isServerEnabled={isServerEnabled}
    />,
  );

beforeEach(() => {
  window.localStorage.clear();
  useMyVotesMock.mockReset().mockReturnValue({ votes: null, isLoaded: true });
});

describe('ParticipationTilesContainer', () => {
  it('서버 집계를 기다리는 동안에는 투표 수를 0 으로 보여주지 않는다', () => {
    useMyVotesMock.mockReturnValue({ votes: null, isLoaded: false });

    const { container } = renderContainer(true);

    expect(screen.queryByText('투표한 이슈')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('서버 집계가 도착하면 투표한 이슈 수를 보여준다', () => {
    useMyVotesMock.mockReturnValue({ votes: MY_VOTES, isLoaded: true });

    renderContainer(true);

    expect(useMyVotesMock).toHaveBeenCalledWith(true);
    expect(screen.getByText('투표한 이슈')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('근거 피드백')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('비로그인이라 집계가 없으면 0 이다', () => {
    useMyVotesMock.mockReturnValue({ votes: null, isLoaded: true });

    renderContainer(true);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('목 모드는 서버 집계를 기다리지 않고 localStorage 기록 수를 보여준다', () => {
    setVote('work-week-4-5', VoteChoice.AGREE);

    renderContainer(false);

    expect(useMyVotesMock).toHaveBeenCalledWith(false);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
