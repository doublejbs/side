import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { useClaimFeedback } from '@/store/useClaimFeedback';
import { sendClaimFeedback } from '@/store/VoteApiClient';

vi.mock('@/store/VoteApiClient', () => ({
  castVoteRequest: vi.fn(),
  fetchMyVote: vi.fn(),
  sendClaimFeedback: vi.fn(),
}));

const sendClaimFeedbackMock = vi.mocked(sendClaimFeedback);

describe('useClaimFeedback', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendClaimFeedbackMock.mockReset();
  });

  it('저장된 피드백이 없으면 null을 반환한다', () => {
    const { result } = renderHook(() => useClaimFeedback('work-week-agree-1'));

    expect(result.current.feedback).toBeNull();
    expect(result.current.isLoaded).toBe(true);
  });

  it('피드백을 선택하면 저장된다', () => {
    const { result } = renderHook(() => useClaimFeedback('work-week-agree-1'));

    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });

    expect(result.current.feedback?.feedback).toBe(ClaimFeedback.PERSUADED);
  });

  it('같은 피드백을 다시 누르면 해제된다', () => {
    const { result } = renderHook(() => useClaimFeedback('work-week-agree-1'));

    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });
    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });

    expect(result.current.feedback).toBeNull();
  });

  it('다른 피드백을 누르면 값이 교체된다', () => {
    const { result } = renderHook(() => useClaimFeedback('work-week-agree-1'));

    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });
    act(() => {
      result.current.toggleFeedback(ClaimFeedback.LACKS_EVIDENCE);
    });

    expect(result.current.feedback?.feedback).toBe(ClaimFeedback.LACKS_EVIDENCE);
  });
});

describe('useClaimFeedback 서버 모드', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendClaimFeedbackMock.mockReset();
  });

  it('목 모드에서는 서버를 호출하지 않는다', () => {
    const { result } = renderHook(() => useClaimFeedback('work-week-agree-1'));

    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });

    expect(sendClaimFeedbackMock).not.toHaveBeenCalled();
  });

  it('서버 모드에서는 선택한 값을 서버에 보낸다', () => {
    sendClaimFeedbackMock.mockResolvedValue({
      claimId: 'work-week-agree-1',
      feedback: ClaimFeedback.PERSUADED,
    });

    const { result } = renderHook(() =>
      useClaimFeedback('work-week-agree-1', { isServerEnabled: true }),
    );

    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });

    expect(result.current.feedback?.feedback).toBe(ClaimFeedback.PERSUADED);
    expect(sendClaimFeedbackMock).toHaveBeenCalledWith(
      'work-week-agree-1',
      ClaimFeedback.PERSUADED,
    );
  });

  it('해제하면 서버에 null 을 보낸다', () => {
    sendClaimFeedbackMock.mockResolvedValue({ claimId: 'work-week-agree-1', feedback: null });

    const { result } = renderHook(() =>
      useClaimFeedback('work-week-agree-1', { isServerEnabled: true }),
    );

    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });
    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });

    expect(sendClaimFeedbackMock).toHaveBeenLastCalledWith('work-week-agree-1', null);
    expect(result.current.feedback).toBeNull();
  });

  it('서버 저장이 실패해도 로컬 선택은 남고 오류를 노출한다', async () => {
    sendClaimFeedbackMock.mockRejectedValue(new Error('네트워크 오류'));

    const { result } = renderHook(() =>
      useClaimFeedback('work-week-agree-1', { isServerEnabled: true }),
    );

    act(() => {
      result.current.toggleFeedback(ClaimFeedback.PERSUADED);
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('네트워크 오류');
    });
    expect(result.current.feedback?.feedback).toBe(ClaimFeedback.PERSUADED);
  });
});
