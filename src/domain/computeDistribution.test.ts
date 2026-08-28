import { describe, expect, it } from 'vitest';

import { computeDistributionAfterVote } from '@/domain/computeDistribution';
import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteDistribution } from '@/domain/Issue';

const WORK_WEEK: VoteDistribution = { agree: 57, disagree: 31, unsure: 12 };

const sumOf = (distribution: VoteDistribution): number =>
  distribution.agree + distribution.disagree + distribution.unsure;

describe('computeDistributionAfterVote', () => {
  it('퍼센트 합이 정확히 100을 유지한다', () => {
    const choices = [VoteChoice.AGREE, VoteChoice.DISAGREE, VoteChoice.UNSURE];

    choices.forEach((choice) => {
      const result = computeDistributionAfterVote(WORK_WEEK, 12481, choice);

      expect(sumOf(result.distribution)).toBe(100);
    });
  });

  it('참여자 수가 1 증가한다', () => {
    const result = computeDistributionAfterVote(WORK_WEEK, 12481, VoteChoice.AGREE);

    expect(result.participantCount).toBe(12482);
  });

  it('12,481명 57/31/12에 찬성을 더해도 찬성 비율이 57% 이상으로 유지된다', () => {
    const result = computeDistributionAfterVote(WORK_WEEK, 12481, VoteChoice.AGREE);

    expect(result.distribution.agree).toBeGreaterThanOrEqual(57);
    expect(sumOf(result.distribution)).toBe(100);
  });

  it('참여자가 적을 때 선택한 항목의 비율이 증가한다', () => {
    const base: VoteDistribution = { agree: 40, disagree: 40, unsure: 20 };
    const result = computeDistributionAfterVote(base, 10, VoteChoice.UNSURE);

    expect(result.distribution.unsure).toBeGreaterThan(base.unsure);
    expect(result.participantCount).toBe(11);
    expect(sumOf(result.distribution)).toBe(100);
  });

  it('참여자가 0명이면 선택한 항목이 100%가 된다', () => {
    const base: VoteDistribution = { agree: 0, disagree: 0, unsure: 0 };
    const result = computeDistributionAfterVote(base, 0, VoteChoice.DISAGREE);

    expect(result.distribution).toEqual({ agree: 0, disagree: 100, unsure: 0 });
    expect(result.participantCount).toBe(1);
  });

  it('반대에 투표하면 반대 표가 증가하고 다른 항목은 늘어나지 않는다', () => {
    const result = computeDistributionAfterVote(WORK_WEEK, 12481, VoteChoice.DISAGREE);

    expect(result.distribution.disagree).toBeGreaterThanOrEqual(WORK_WEEK.disagree);
    expect(result.distribution.agree).toBeLessThanOrEqual(WORK_WEEK.agree);
  });

  it('반올림이 애매한 분포에서도 참여자 수가 정확히 1 증가한다', () => {
    const base: VoteDistribution = { agree: 33, disagree: 33, unsure: 34 };
    const result = computeDistributionAfterVote(base, 7, VoteChoice.AGREE);

    expect(result.participantCount).toBe(8);
    expect(sumOf(result.distribution)).toBe(100);
  });

  it('원본 분포를 변경하지 않는다', () => {
    const base: VoteDistribution = { agree: 57, disagree: 31, unsure: 12 };

    computeDistributionAfterVote(base, 12481, VoteChoice.AGREE);

    expect(base).toEqual({ agree: 57, disagree: 31, unsure: 12 });
  });
});
