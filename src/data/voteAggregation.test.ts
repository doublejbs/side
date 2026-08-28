import { describe, expect, it } from 'vitest';

import { aggregateVotes } from '@/data/voteAggregation';

describe('aggregateVotes', () => {
  it('표가 하나도 없으면 분포 0·참여자 0을 반환한다', () => {
    expect(aggregateVotes({ agree: 0, disagree: 0, unsure: 0 })).toEqual({
      distribution: { agree: 0, disagree: 0, unsure: 0 },
      participantCount: 0,
    });
  });

  it('참여자 수는 세 선택지 표 수의 합이다', () => {
    const { participantCount } = aggregateVotes({ agree: 57, disagree: 31, unsure: 12 });

    expect(participantCount).toBe(100);
  });

  it('퍼센트로 나누어떨어지는 표는 그대로 퍼센트가 된다', () => {
    const { distribution } = aggregateVotes({ agree: 57, disagree: 31, unsure: 12 });

    expect(distribution).toEqual({ agree: 57, disagree: 31, unsure: 12 });
  });

  it('나누어떨어지지 않아도 퍼센트 합은 항상 100이다', () => {
    const { distribution } = aggregateVotes({ agree: 1, disagree: 1, unsure: 1 });

    expect(distribution.agree + distribution.disagree + distribution.unsure).toBe(100);
  });

  it('최대 나머지 방식으로 남은 1%를 나머지가 큰 선택지에 배분한다', () => {
    const { distribution, participantCount } = aggregateVotes({
      agree: 2,
      disagree: 1,
      unsure: 4,
    });

    expect(participantCount).toBe(7);
    // 정확값 28.57 / 14.28 / 57.14 → 내림 28 / 14 / 57 = 99, 나머지가 가장 큰 agree 가 +1
    expect(distribution).toEqual({ agree: 29, disagree: 14, unsure: 57 });
  });

  it('한 선택지에만 표가 몰리면 100%가 된다', () => {
    expect(aggregateVotes({ agree: 3, disagree: 0, unsure: 0 })).toEqual({
      distribution: { agree: 100, disagree: 0, unsure: 0 },
      participantCount: 3,
    });
  });
});
