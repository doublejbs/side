import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteResultResponse } from '@/domain/VoteApiTypes';
import { getMyVotesSnapshot, resetMyVotes, startMyVotesLoad } from '@/store/MyVotesCache';
import { castVoteRequest, fetchMyVote, sendClaimFeedback } from '@/store/VoteApiClient';

const VOTE_RESULT: VoteResultResponse = {
  slug: 'work-week-4-5',
  distribution: { agree: 60, disagree: 30, unsure: 10 },
  participantCount: 10,
  myChoice: VoteChoice.AGREE,
};

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const MY_VOTES_PATH = '/api/me/votes';

const fetchMock = vi.fn();

/** `startMyVotesLoad` 가 시작한 조회가 캐시에 반영될 때까지 기다린다. */
const waitForMyVotes = async (): Promise<void> => {
  while (!getMyVotesSnapshot().isLoaded) {
    await Promise.resolve();
  }
};

beforeEach(() => {
  resetMyVotes();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('castVoteRequest', () => {
  it('선택을 담아 POST 하고 응답을 돌려준다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(VOTE_RESULT));

    await expect(castVoteRequest('work-week-4-5', VoteChoice.AGREE)).resolves.toEqual(VOTE_RESULT);
    expect(fetchMock).toHaveBeenCalledWith('/api/issues/work-week-4-5/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice: VoteChoice.AGREE }),
    });
  });

  it('실패 응답이면 예외를 던진다', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'SERVER_VOTE_DISABLED' }, 503));

    await expect(castVoteRequest('work-week-4-5', VoteChoice.AGREE)).rejects.toThrow('503');
  });

  it('slug 를 URL 인코딩한다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(VOTE_RESULT));

    await castVoteRequest('a b', VoteChoice.UNSURE);

    expect(fetchMock.mock.calls[0][0]).toBe('/api/issues/a%20b/votes');
  });

  it('성공하면 내 투표 목록 캐시를 무효화해 다음 조회에서 다시 받게 한다', async () => {
    fetchMock.mockImplementation(async (path: string) =>
      path === MY_VOTES_PATH ? jsonResponse({ votes: [] }) : jsonResponse(VOTE_RESULT),
    );
    startMyVotesLoad();

    await waitForMyVotes();

    fetchMock.mockClear();

    await castVoteRequest('work-week-4-5', VoteChoice.AGREE);

    startMyVotesLoad();

    expect(fetchMock).toHaveBeenCalledWith(MY_VOTES_PATH, { cache: 'no-store' });
    // 마지막 목록은 그대로 두고 다시 받아오게만 한다(화면 깜빡임 방지).
    expect(getMyVotesSnapshot()).toEqual({ votes: [], isLoaded: true });
  });

  it('실패하면 내 투표 목록을 다시 받아오지 않는다', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'LOGIN_REQUIRED' }, 401));
    startMyVotesLoad();

    await waitForMyVotes();

    fetchMock.mockClear();

    await expect(castVoteRequest('work-week-4-5', VoteChoice.AGREE)).rejects.toThrow();

    startMyVotesLoad();

    expect(fetchMock).not.toHaveBeenCalledWith(MY_VOTES_PATH, { cache: 'no-store' });
  });
});

describe('fetchMyVote', () => {
  it('내 선택 엔드포인트를 GET 한다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(VOTE_RESULT));

    await expect(fetchMyVote('work-week-4-5')).resolves.toEqual(VOTE_RESULT);
    expect(fetchMock).toHaveBeenCalledWith('/api/issues/work-week-4-5/votes/me', {
      cache: 'no-store',
    });
  });

  it('404 면 예외를 던진다', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'ISSUE_NOT_FOUND' }, 404));

    await expect(fetchMyVote('unknown')).rejects.toThrow('404');
  });
});

describe('sendClaimFeedback', () => {
  it('피드백을 POST 한다', async () => {
    const body = { claimId: 'claim-1', feedback: ClaimFeedback.PERSUADED };

    fetchMock.mockResolvedValue(jsonResponse(body));

    await expect(sendClaimFeedback('claim-1', ClaimFeedback.PERSUADED)).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith('/api/claims/claim-1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: ClaimFeedback.PERSUADED }),
    });
  });

  it('해제는 null 을 보낸다', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ claimId: 'claim-1', feedback: null }));

    await sendClaimFeedback('claim-1', null);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ body: JSON.stringify({ feedback: null }) });
  });
});
