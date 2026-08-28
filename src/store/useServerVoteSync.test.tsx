import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VoteResultResponse } from '@/domain/VoteApiTypes';
import { VoteChoice } from '@/domain/VoteChoice';
import { setVote } from '@/store/UserRecordStore';
import { useServerVoteSync } from '@/store/useServerVoteSync';
import { fetchMyVote } from '@/store/VoteApiClient';
import { getVoteResult, resetVoteResults } from '@/store/VoteResultCache';

vi.mock('@/store/VoteApiClient', () => ({
  castVoteRequest: vi.fn(),
  fetchMyVote: vi.fn(),
  sendClaimFeedback: vi.fn(),
}));

const fetchMyVoteMock = vi.mocked(fetchMyVote);

const SLUG = 'work-week-4-5';

/** 훅이 재조회를 예약하는 간격보다 넉넉히 넘긴다. */
const PAST_RETRY_DELAY_MS = 600;

const resultWith = (myChoice: VoteChoice | null): VoteResultResponse => ({
  slug: SLUG,
  distribution: { agree: 55, disagree: 35, unsure: 10 },
  participantCount: 20,
  myChoice,
});

const flush = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('useServerVoteSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    resetVoteResults();
    fetchMyVoteMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('로컬 투표 기록이 있는데 서버가 내 선택을 모르면 한 번 다시 조회한다', async () => {
    setVote(SLUG, VoteChoice.AGREE);
    fetchMyVoteMock
      .mockResolvedValueOnce(resultWith(null))
      .mockResolvedValue(resultWith(VoteChoice.AGREE));

    renderHook(() => useServerVoteSync(SLUG, true));

    await flush(0);

    expect(fetchMyVoteMock).toHaveBeenCalledTimes(1);

    await flush(PAST_RETRY_DELAY_MS);

    expect(fetchMyVoteMock).toHaveBeenCalledTimes(2);
    expect(getVoteResult(SLUG)?.myChoice).toBe(VoteChoice.AGREE);
  });

  it('다시 조회해도 내 선택이 없으면 더 이상 반복하지 않는다', async () => {
    setVote(SLUG, VoteChoice.AGREE);
    fetchMyVoteMock.mockResolvedValue(resultWith(null));

    renderHook(() => useServerVoteSync(SLUG, true));

    await flush(PAST_RETRY_DELAY_MS);
    await flush(PAST_RETRY_DELAY_MS);

    expect(fetchMyVoteMock).toHaveBeenCalledTimes(2);
  });

  it('로컬 투표 기록이 없으면 다시 조회하지 않는다', async () => {
    fetchMyVoteMock.mockResolvedValue(resultWith(null));

    renderHook(() => useServerVoteSync(SLUG, true));

    await flush(PAST_RETRY_DELAY_MS);

    expect(fetchMyVoteMock).toHaveBeenCalledTimes(1);
  });

  it('서버가 내 선택을 알려주면 다시 조회하지 않는다', async () => {
    setVote(SLUG, VoteChoice.AGREE);
    fetchMyVoteMock.mockResolvedValue(resultWith(VoteChoice.AGREE));

    renderHook(() => useServerVoteSync(SLUG, true));

    await flush(PAST_RETRY_DELAY_MS);

    expect(fetchMyVoteMock).toHaveBeenCalledTimes(1);
  });

  it('언마운트하면 예약된 재조회를 취소한다', async () => {
    setVote(SLUG, VoteChoice.AGREE);
    fetchMyVoteMock.mockResolvedValue(resultWith(null));

    const { unmount } = renderHook(() => useServerVoteSync(SLUG, true));

    await flush(0);

    unmount();

    await flush(PAST_RETRY_DELAY_MS);

    expect(fetchMyVoteMock).toHaveBeenCalledTimes(1);
  });

  it('서버 모드가 꺼져 있으면 조회하지 않는다', async () => {
    renderHook(() => useServerVoteSync(SLUG, false));

    await flush(PAST_RETRY_DELAY_MS);

    expect(fetchMyVoteMock).not.toHaveBeenCalled();
  });
});
