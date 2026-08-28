import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { useClaimFeedback } from '@/store/useClaimFeedback';

describe('useClaimFeedback', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
