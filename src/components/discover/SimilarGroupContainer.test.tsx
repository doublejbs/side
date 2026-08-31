import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SimilarGroupContainer } from '@/components/discover/SimilarGroupContainer';
import type { MyVote } from '@/domain/MyVote';
import type { OpinionGroupSummary } from '@/domain/OpinionGroupSummary';
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

const GROUP: OpinionGroupSummary = {
  id: 'group-1',
  label: '조건부 찬성',
  share: 42,
  description: '도입에는 찬성하지만 속도 조절이 필요하다고 봐요',
};

const MY_VOTES: MyVote[] = [
  { slug: 'work-week-4-5', choice: VoteChoice.AGREE, votedAt: '2026-08-02T00:00:00.000Z' },
  { slug: 'ai-regulation', choice: VoteChoice.DISAGREE, votedAt: '2026-08-01T00:00:00.000Z' },
];

const LOGIN_HREF = '/login?next=%2Fdiscover';

const EMPTY_TEXT = '이슈에 참여하면 비슷한 그룹을 찾아드려요';

const renderContainer = (isServerEnabled: boolean) =>
  render(
    <SimilarGroupContainer
      group={GROUP}
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

describe('SimilarGroupContainer', () => {
  it('서버 집계를 기다리는 동안에는 참여가 없다고 단정하지 않는다', () => {
    useMyVotesMock.mockReturnValue({ votes: null, isLoaded: false });

    const { container } = renderContainer(true);

    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('서버 집계가 도착하면 참여한 이슈 수로 그룹을 보여준다', () => {
    useMyVotesMock.mockReturnValue({ votes: MY_VOTES, isLoaded: true });

    renderContainer(true);

    expect(useMyVotesMock).toHaveBeenCalledWith(true);
    expect(screen.getByText('참여한 2개 이슈 기반')).toBeInTheDocument();
    expect(screen.getByText(GROUP.label)).toBeInTheDocument();
  });

  it('서버 집계에 내 표가 없으면 참여 안내를 보여준다', () => {
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
    setVote('work-week-4-5', VoteChoice.AGREE);

    renderContainer(false);

    expect(useMyVotesMock).toHaveBeenCalledWith(false);
    expect(screen.getByText('참여한 1개 이슈 기반')).toBeInTheDocument();
  });
});
