import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteResultResponse } from '@/domain/VoteApiTypes';
import { LoginRequiredError } from '@/store/LoginRequiredError';
import { getVote, setVote, VOTE_STORAGE_KEY } from '@/store/UserRecordStore';
import { useVote } from '@/store/useVote';
import { castVoteRequest } from '@/store/VoteApiClient';
import {
  getVoteResult,
  nextVoteRequestSeq,
  publishVoteResult,
  resetVoteResults,
} from '@/store/VoteResultCache';

vi.mock('@/store/VoteApiClient', () => ({
  castVoteRequest: vi.fn(),
  fetchMyVote: vi.fn(),
  sendClaimFeedback: vi.fn(),
}));

const castVoteRequestMock = vi.mocked(castVoteRequest);

const SERVER_RESULT: VoteResultResponse = {
  slug: 'work-week-4-5',
  distribution: { agree: 55, disagree: 35, unsure: 10 },
  participantCount: 20,
  myChoice: VoteChoice.AGREE,
};

describe('useVote', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetVoteResults();
    castVoteRequestMock.mockReset();
  });

  it('저장된 투표가 없으면 null을 반환하고 로드 완료를 알린다', () => {
    const { result } = renderHook(() => useVote('work-week-4-5'));

    expect(result.current.vote).toBeNull();
    expect(result.current.isLoaded).toBe(true);
  });

  it('이미 저장된 투표를 읽어온다', () => {
    setVote('work-week-4-5', VoteChoice.DISAGREE);

    const { result } = renderHook(() => useVote('work-week-4-5'));

    expect(result.current.vote?.choice).toBe(VoteChoice.DISAGREE);
  });

  it('castVote 호출 시 상태와 저장소가 함께 갱신된다', () => {
    const { result } = renderHook(() => useVote('work-week-4-5'));

    act(() => {
      result.current.castVote(VoteChoice.AGREE);
    });

    expect(result.current.vote?.choice).toBe(VoteChoice.AGREE);
    expect(result.current.vote?.issueId).toBe('work-week-4-5');
  });

  it('다른 이슈의 투표는 서로 영향을 주지 않는다', () => {
    const workWeek = renderHook(() => useVote('work-week-4-5'));
    const nuclear = renderHook(() => useVote('nuclear-expansion'));

    act(() => {
      workWeek.result.current.castVote(VoteChoice.AGREE);
    });

    expect(workWeek.result.current.vote?.choice).toBe(VoteChoice.AGREE);
    expect(nuclear.result.current.vote).toBeNull();
  });
});

describe('useVote 서버 모드', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetVoteResults();
    castVoteRequestMock.mockReset();
  });

  it('목 모드에서는 서버를 호출하지 않는다', () => {
    const { result } = renderHook(() => useVote('work-week-4-5'));

    act(() => {
      result.current.castVote(VoteChoice.AGREE);
    });

    expect(castVoteRequestMock).not.toHaveBeenCalled();
    expect(result.current.serverResult).toBeNull();
  });

  it('서버 모드에서는 로컬에 먼저 기록하고 서버에 투표를 보낸다', async () => {
    castVoteRequestMock.mockResolvedValue(SERVER_RESULT);

    const { result } = renderHook(() =>
      useVote('work-week-4-5', { isServerEnabled: true }),
    );

    act(() => {
      result.current.castVote(VoteChoice.AGREE);
    });

    expect(result.current.vote?.choice).toBe(VoteChoice.AGREE);
    expect(castVoteRequestMock).toHaveBeenCalledWith('work-week-4-5', VoteChoice.AGREE);

    await waitFor(() => {
      expect(result.current.serverResult).toEqual(SERVER_RESULT);
    });
    expect(getVoteResult('work-week-4-5')).toEqual(SERVER_RESULT);
  });

  it('늦게 도착한 투표 응답은 더 최근 결과를 덮어쓰지 않는다', async () => {
    let resolveCast: (result: VoteResultResponse) => void = () => {};

    castVoteRequestMock.mockReturnValue(
      new Promise<VoteResultResponse>((resolve) => {
        resolveCast = resolve;
      }),
    );

    const { result } = renderHook(() => useVote('work-week-4-5', { isServerEnabled: true }));

    act(() => {
      result.current.castVote(VoteChoice.AGREE);
    });

    const latest: VoteResultResponse = { ...SERVER_RESULT, participantCount: 99 };

    act(() => {
      publishVoteResult('work-week-4-5', latest, nextVoteRequestSeq());
    });
    act(() => {
      resolveCast(SERVER_RESULT);
    });

    await waitFor(() => {
      expect(result.current.serverResult).toEqual(latest);
    });
  });

  it('서버 저장이 실패해도 로컬 기록은 남기고 오류를 노출한다', async () => {
    castVoteRequestMock.mockRejectedValue(new Error('네트워크 오류'));

    const { result } = renderHook(() =>
      useVote('work-week-4-5', { isServerEnabled: true }),
    );

    act(() => {
      result.current.castVote(VoteChoice.DISAGREE);
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('네트워크 오류');
    });
    expect(result.current.vote?.choice).toBe(VoteChoice.DISAGREE);
    expect(result.current.serverResult).toBeNull();
  });

  it('로그인이 필요해 거절되면 처음 투표는 로컬에도 남지 않는다', async () => {
    castVoteRequestMock.mockRejectedValue(new LoginRequiredError());

    const { result } = renderHook(() =>
      useVote('work-week-4-5', { isServerEnabled: true }),
    );

    act(() => {
      result.current.castVote(VoteChoice.AGREE);
    });

    await waitFor(() => {
      expect(result.current.isLoginRequired).toBe(true);
    });
    expect(result.current.vote).toBeNull();
    expect(getVote('work-week-4-5')).toBeNull();
    expect(window.localStorage.getItem(VOTE_STORAGE_KEY)).not.toContain('work-week-4-5');
  });

  it('로그인이 필요해 거절되면 이전 선택으로 되돌린다', async () => {
    setVote('work-week-4-5', VoteChoice.AGREE);
    castVoteRequestMock.mockRejectedValue(new LoginRequiredError());

    const { result } = renderHook(() =>
      useVote('work-week-4-5', { isServerEnabled: true }),
    );

    act(() => {
      result.current.castVote(VoteChoice.DISAGREE);
    });

    await waitFor(() => {
      expect(result.current.isLoginRequired).toBe(true);
    });
    expect(result.current.vote?.choice).toBe(VoteChoice.AGREE);
    expect(getVote('work-week-4-5')?.choice).toBe(VoteChoice.AGREE);
  });

  it('일반 오류(500)에서는 로컬 기록을 되돌리지 않는다', async () => {
    setVote('work-week-4-5', VoteChoice.AGREE);
    castVoteRequestMock.mockRejectedValue(new Error('서버 오류'));

    const { result } = renderHook(() =>
      useVote('work-week-4-5', { isServerEnabled: true }),
    );

    act(() => {
      result.current.castVote(VoteChoice.DISAGREE);
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('서버 오류');
    });
    expect(result.current.vote?.choice).toBe(VoteChoice.DISAGREE);
    expect(getVote('work-week-4-5')?.choice).toBe(VoteChoice.DISAGREE);
  });

  it('목 모드에서는 서버 분포를 읽지 않는다', () => {
    publishVoteResult('work-week-4-5', SERVER_RESULT, nextVoteRequestSeq());

    const { result } = renderHook(() => useVote('work-week-4-5'));

    expect(result.current.serverResult).toBeNull();
  });
});
