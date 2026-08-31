import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MostDifferentIssueContainer } from '@/components/discover/MostDifferentIssueContainer';
import type { IssueSummary } from '@/domain/IssueSummary';
import type { MyVote } from '@/domain/MyVote';
import type { SessionUser } from '@/domain/SessionUser';
import { VoteChoice } from '@/domain/VoteChoice';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { useMyVotes } from '@/store/useMyVotes';
import { useSessionUser } from '@/store/useSessionUser';
import { setVote } from '@/store/UserRecordStore';

vi.mock('@/lib/auth/isAuthEnabled', () => ({ isAuthEnabled: vi.fn() }));
vi.mock('@/store/useMyVotes', () => ({ useMyVotes: vi.fn() }));
vi.mock('@/store/useSessionUser', () => ({ useSessionUser: vi.fn() }));

const isAuthEnabledMock = vi.mocked(isAuthEnabled);

const useMyVotesMock = vi.mocked(useMyVotes);

const useSessionUserMock = vi.mocked(useSessionUser);

const USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

const CANDIDATES: IssueSummary[] = [
  {
    slug: 'work-week-4-5',
    question: '주 4.5일제를 도입해야 할까?',
    participantCount: 100,
    distribution: { agree: 70, disagree: 20, unsure: 10 },
    tags: ['노동'],
  },
  {
    slug: 'ai-regulation',
    question: 'AI 규제를 강화해야 할까?',
    participantCount: 80,
    distribution: { agree: 60, disagree: 30, unsure: 10 },
    tags: ['기술'],
  },
];

/** 찬성 70% 이슈보다 반대 30% 이슈가 "나와 더 다른" 이슈다. */
const MY_VOTES: MyVote[] = [
  { slug: 'work-week-4-5', choice: VoteChoice.AGREE, votedAt: '2026-08-02T00:00:00.000Z' },
  { slug: 'ai-regulation', choice: VoteChoice.DISAGREE, votedAt: '2026-08-01T00:00:00.000Z' },
];

const LOGIN_HREF = '/login?next=%2Fdiscover';

const EMPTY_TEXT = '아직 투표한 이슈가 없어요. 이슈에 의견을 남기면 나와 가장 다른 여론을 보여드릴게요.';

const renderContainer = (isServerEnabled: boolean) =>
  render(
    <MostDifferentIssueContainer
      candidates={CANDIDATES}
      loginHref={LOGIN_HREF}
      isServerEnabled={isServerEnabled}
    />,
  );

beforeEach(() => {
  window.localStorage.clear();
  isAuthEnabledMock.mockReset().mockReturnValue(true);
  useSessionUserMock.mockReset().mockReturnValue({ user: USER, isLoaded: true });
  useMyVotesMock.mockReset().mockReturnValue({ votes: null, isLoaded: true });
});

describe('MostDifferentIssueContainer', () => {
  it('서버 집계를 기다리는 동안에는 투표가 없다고 단정하지 않는다', () => {
    useMyVotesMock.mockReturnValue({ votes: null, isLoaded: false });

    const { container } = renderContainer(true);

    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('서버 집계가 도착하면 내 선택 비율이 가장 낮은 이슈를 보여준다', () => {
    useMyVotesMock.mockReturnValue({ votes: MY_VOTES, isLoaded: true });

    renderContainer(true);

    expect(useMyVotesMock).toHaveBeenCalledWith(true);
    expect(screen.getByRole('link', { name: /AI 규제를 강화해야 할까\?/ })).toBeInTheDocument();
    expect(screen.getByText('내 선택 · 반대')).toBeInTheDocument();
  });

  it('서버 집계에 내 표가 없으면 투표 안내를 보여준다', () => {
    useMyVotesMock.mockReturnValue({ votes: [], isLoaded: true });

    renderContainer(true);

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  it('비로그인이면 로그인 안내를 보여준다', () => {
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: true });

    renderContainer(true);

    expect(screen.getByRole('link', { name: /로그인하기/ })).toHaveAttribute('href', LOGIN_HREF);
  });

  it('목 모드는 서버 집계를 기다리지 않고 localStorage 기록을 쓴다', () => {
    isAuthEnabledMock.mockReturnValue(false);
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: true });
    setVote('ai-regulation', VoteChoice.DISAGREE);

    renderContainer(false);

    expect(useMyVotesMock).toHaveBeenCalledWith(false);
    expect(screen.getByRole('link', { name: /AI 규제를 강화해야 할까\?/ })).toBeInTheDocument();
  });
});
