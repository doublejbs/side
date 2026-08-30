import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VoteResultContainer } from '@/components/result/VoteResultContainer';
import { MOCK_ISSUES } from '@/data/MockIssueRepository';
import type { SessionUser } from '@/domain/SessionUser';
import { toIssueResultSummary } from '@/domain/IssueResultSummary';
import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteResultResponse } from '@/domain/VoteApiTypes';
import { useSessionUser } from '@/store/useSessionUser';
import { setVote } from '@/store/UserRecordStore';
import { fetchMyVote } from '@/store/VoteApiClient';
import { nextVoteRequestSeq, publishVoteResult, resetVoteResults } from '@/store/VoteResultCache';

vi.mock('@/store/VoteApiClient', () => ({
  castVoteRequest: vi.fn(),
  fetchMyVote: vi.fn(),
  sendClaimFeedback: vi.fn(),
}));
vi.mock('@/store/useSessionUser', () => ({ useSessionUser: vi.fn() }));

const fetchMyVoteMock = vi.mocked(fetchMyVote);

const useSessionUserMock = vi.mocked(useSessionUser);

const SESSION_USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

/** 세션을 로그인 상태로 확정한다. 세션은 이제 컨테이너가 클라이언트에서 읽는다. */
const signIn = (): void => {
  useSessionUserMock.mockReturnValue({ user: SESSION_USER, isLoaded: true });
};

const issue = toIssueResultSummary(MOCK_ISSUES[0]);

describe('VoteResultContainer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetVoteResults();
    useSessionUserMock.mockReset().mockReturnValue({ user: null, isLoaded: true });
  });

  it('투표 기록이 없으면 투표 안내 카드를 보여준다', () => {
    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByText('아직 이 이슈에 의견을 남기지 않았어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /의견 남기기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.slug}#vote`,
    );
  });

  it('찬성에 투표했다면 반영된 분포와 반대 의견 CTA를 보여준다', () => {
    setVote(issue.slug, VoteChoice.AGREE);

    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByText('12,482명이')).toBeInTheDocument();
    expect(screen.getByText('반대 의견 3개와 근거 9개를 읽어볼 수 있어요.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /반대 의견 읽어보기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.slug}#disagree`,
    );
    expect(screen.getByText('비슷한 생각을 가진 사람들')).toBeInTheDocument();
  });

  it('반대에 투표했다면 찬성 의견 CTA를 보여준다', () => {
    setVote(issue.slug, VoteChoice.DISAGREE);

    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByRole('link', { name: /찬성 의견 읽어보기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.slug}#agree`,
    );
  });

  it('모르겠음에 투표했다면 찬성 의견 CTA를 보여준다', () => {
    setVote(issue.slug, VoteChoice.UNSURE);

    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByRole('link', { name: /찬성 의견 읽어보기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.slug}#agree`,
    );
  });
});

describe('VoteResultContainer 서버 모드', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetVoteResults();
    useSessionUserMock.mockReset();
    signIn();
    fetchMyVoteMock.mockReset();
  });

  const serverResult: VoteResultResponse = {
    slug: issue.slug,
    distribution: { agree: 41, disagree: 44, unsure: 15 },
    participantCount: 77,
    myChoice: VoteChoice.AGREE,
  };

  it('이미 받아온 분포가 있어도 마운트마다 다시 받아온다', async () => {
    setVote(issue.slug, VoteChoice.AGREE);
    publishVoteResult(issue.slug, serverResult, nextVoteRequestSeq());
    fetchMyVoteMock.mockResolvedValue({ ...serverResult, participantCount: 78 });

    render(<VoteResultContainer issue={issue} isServerEnabled />);

    expect(screen.getByText('77명이')).toBeInTheDocument();
    expect(fetchMyVoteMock).toHaveBeenCalledWith(issue.slug);
    await waitFor(() => {
      expect(screen.getByText('78명이')).toBeInTheDocument();
    });
  });

  it('받아온 분포가 없으면 서버에서 받아와 갱신한다', async () => {
    setVote(issue.slug, VoteChoice.AGREE);
    fetchMyVoteMock.mockResolvedValue(serverResult);

    render(<VoteResultContainer issue={issue} isServerEnabled />);

    expect(fetchMyVoteMock).toHaveBeenCalledWith(issue.slug);
    await waitFor(() => {
      expect(screen.getByText('77명이')).toBeInTheDocument();
    });
  });

  it('서버 응답 전에는 서버 렌더 분포를 그대로 보여준다', () => {
    setVote(issue.slug, VoteChoice.AGREE);
    fetchMyVoteMock.mockReturnValue(new Promise(() => {}));

    render(<VoteResultContainer issue={issue} isServerEnabled />);

    expect(
      screen.getByText(`${issue.participantCount.toLocaleString('ko-KR')}명이`),
    ).toBeInTheDocument();
  });

  it('늦게 도착한 조회 응답이 더 최근 투표 결과를 덮어쓰지 않는다', async () => {
    setVote(issue.slug, VoteChoice.AGREE);

    let resolveFetch: (result: VoteResultResponse) => void = () => {};

    fetchMyVoteMock.mockReturnValue(
      new Promise<VoteResultResponse>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<VoteResultContainer issue={issue} isServerEnabled />);

    // 조회(GET)보다 나중에 시작한 투표(POST)가 먼저 도착한 상황.
    const voteResult: VoteResultResponse = { ...serverResult, participantCount: 120 };

    await act(async () => {
      publishVoteResult(issue.slug, voteResult, nextVoteRequestSeq());
    });

    expect(screen.getByText('120명이')).toBeInTheDocument();

    await act(async () => {
      resolveFetch(serverResult);
    });

    expect(screen.getByText('120명이')).toBeInTheDocument();
    expect(screen.queryByText('77명이')).not.toBeInTheDocument();
  });

  it('분포를 받아오지 못하면 안내 문구를 보여준다', async () => {
    setVote(issue.slug, VoteChoice.AGREE);
    fetchMyVoteMock.mockRejectedValue(new Error('투표 API 요청이 실패했어요 (500)'));

    render(<VoteResultContainer issue={issue} isServerEnabled />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('저장에 실패했어요. 다시 시도해 주세요.');
    });
  });

  it('투표 기록이 없으면 서버 모드에서도 투표 안내 카드를 보여준다', () => {
    fetchMyVoteMock.mockResolvedValue(serverResult);

    render(<VoteResultContainer issue={issue} isServerEnabled />);

    expect(screen.getByText('아직 이 이슈에 의견을 남기지 않았어요')).toBeInTheDocument();
  });
});

describe('VoteResultContainer 비로그인', () => {
  const LOGIN_HREF = `/login?next=${encodeURIComponent(`/issues/${issue.slug}#vote`)}`;

  beforeEach(() => {
    window.localStorage.clear();
    resetVoteResults();
    useSessionUserMock.mockReset().mockReturnValue({ user: null, isLoaded: true });
    fetchMyVoteMock.mockReset();
    fetchMyVoteMock.mockResolvedValue({
      slug: issue.slug,
      distribution: issue.distribution,
      participantCount: issue.participantCount,
      myChoice: null,
    });
  });

  it('내 선택 배지 없이 분포와 로그인 링크를 보여준다', () => {
    render(<VoteResultContainer issue={issue} isServerEnabled loginHref={LOGIN_HREF} />);

    expect(
      screen.getByText(`${issue.participantCount.toLocaleString('ko-KR')}명이`),
    ).toBeInTheDocument();
    expect(screen.queryByText('내 선택')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인하고 투표하기/ })).toHaveAttribute(
      'href',
      LOGIN_HREF,
    );
  });

  it('로컬에 남은 투표 기록이 있어도 내 선택을 보여주지 않는다', () => {
    setVote(issue.slug, VoteChoice.AGREE);

    render(<VoteResultContainer issue={issue} isServerEnabled loginHref={LOGIN_HREF} />);

    expect(screen.queryByText('내 선택')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인하고 투표하기/ })).toBeInTheDocument();
  });

  it('세션을 읽기 전에는 결과 대신 자리만 보여준다', () => {
    setVote(issue.slug, VoteChoice.AGREE);
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: false });

    const { container } = render(
      <VoteResultContainer issue={issue} isServerEnabled loginHref={LOGIN_HREF} />,
    );

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /로그인하고 투표하기/ })).not.toBeInTheDocument();
  });

  it('목 모드에서는 세션이 없어도 내 선택을 보여준다', () => {
    setVote(issue.slug, VoteChoice.AGREE);

    render(<VoteResultContainer issue={issue} loginHref={LOGIN_HREF} />);

    expect(screen.getByText('내 선택')).toBeInTheDocument();
  });
});
