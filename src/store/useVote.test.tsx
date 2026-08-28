import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { VoteChoice } from '@/domain/VoteChoice';
import { setVote } from '@/store/UserRecordStore';
import { useVote } from '@/store/useVote';

describe('useVote', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
