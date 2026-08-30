import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteResultResponse } from '@/domain/VoteApiTypes';
import {
  getVoteResult,
  getVoteResultError,
  getVoteResultVersion,
  nextVoteRequestSeq,
  publishVoteResult,
  publishVoteResultError,
  resetVoteResults,
  subscribeVoteResult,
} from '@/store/VoteResultCache';

const createResult = (
  overrides: Partial<VoteResultResponse> = {},
): VoteResultResponse => ({
  slug: 'work-week-4-5',
  distribution: { agree: 50, disagree: 30, unsure: 20 },
  participantCount: 10,
  myChoice: VoteChoice.AGREE,
  ...overrides,
});

describe('VoteResultCache', () => {
  beforeEach(() => {
    resetVoteResults();
  });

  it('받아온 적이 없으면 null 이다', () => {
    expect(getVoteResult('work-week-4-5')).toBeNull();
    expect(getVoteResultError('work-week-4-5')).toBeNull();
  });

  it('발행한 분포를 다시 읽는다', () => {
    const result = createResult();

    publishVoteResult('work-week-4-5', result, nextVoteRequestSeq());

    expect(getVoteResult('work-week-4-5')).toEqual(result);
  });

  it('이슈별로 따로 담는다', () => {
    publishVoteResult('work-week-4-5', createResult(), nextVoteRequestSeq());

    expect(getVoteResult('nuclear-expansion')).toBeNull();
  });

  it('구독자에게 변경을 알리고 버전을 올린다', () => {
    const listener = vi.fn();
    const before = getVoteResultVersion();
    const unsubscribe = subscribeVoteResult(listener);

    publishVoteResult('work-week-4-5', createResult(), nextVoteRequestSeq());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getVoteResultVersion()).toBeGreaterThan(before);

    unsubscribe();
    publishVoteResult('work-week-4-5', createResult(), nextVoteRequestSeq());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('늦게 도착한 이전 요청의 결과는 최신 결과를 덮어쓰지 않는다', () => {
    const earlySeq = nextVoteRequestSeq();
    const lateSeq = nextVoteRequestSeq();
    const late = createResult({ participantCount: 77 });

    publishVoteResult('work-week-4-5', late, lateSeq);
    publishVoteResult('work-week-4-5', createResult({ participantCount: 10 }), earlySeq);

    expect(getVoteResult('work-week-4-5')).toEqual(late);
  });

  it('같은 순번이면 나중에 발행한 값을 쓴다', () => {
    const seq = nextVoteRequestSeq();

    publishVoteResult('work-week-4-5', createResult({ participantCount: 10 }), seq);
    publishVoteResult('work-week-4-5', createResult({ participantCount: 11 }), seq);

    expect(getVoteResult('work-week-4-5')?.participantCount).toBe(11);
  });

  it('오류를 발행해도 마지막으로 받아온 분포는 남는다', () => {
    const result = createResult();

    publishVoteResult('work-week-4-5', result, nextVoteRequestSeq());
    publishVoteResultError('work-week-4-5', new Error('네트워크 오류'), nextVoteRequestSeq());

    expect(getVoteResult('work-week-4-5')).toEqual(result);
    expect(getVoteResultError('work-week-4-5')?.message).toBe('네트워크 오류');
  });

  it('성공 응답이 도착하면 오류가 지워진다', () => {
    publishVoteResultError('work-week-4-5', new Error('네트워크 오류'), nextVoteRequestSeq());
    publishVoteResult('work-week-4-5', createResult(), nextVoteRequestSeq());

    expect(getVoteResultError('work-week-4-5')).toBeNull();
  });

  it('reset 하면 저장한 분포와 순번이 사라진다', () => {
    publishVoteResult('work-week-4-5', createResult(), nextVoteRequestSeq());
    resetVoteResults();

    expect(getVoteResult('work-week-4-5')).toBeNull();
    expect(nextVoteRequestSeq()).toBe(1);
  });
});
