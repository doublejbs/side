import { describe, expect, it } from 'vitest';

import {
  OPINION_CHANGES,
  PARTICIPATION_SUMMARY,
  PERSPECTIVE_POINTS,
} from '@/data/perspectiveData';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { getAxisLabels } from '@/domain/perspectiveAxisLabels';
import { MockIssueRepository } from '@/data/MockIssueRepository';

const repository = new MockIssueRepository();

describe('perspectiveData', () => {
  it('정치 관점 축 5개를 0~100 범위 값으로 제공한다', () => {
    expect(PERSPECTIVE_POINTS).toHaveLength(5);
    expect(PERSPECTIVE_POINTS.map((point) => point.axis)).toEqual([
      PerspectiveAxis.ECONOMY,
      PerspectiveAxis.WELFARE,
      PerspectiveAxis.LABOR,
      PerspectiveAxis.ENVIRONMENT,
      PerspectiveAxis.DIPLOMACY,
    ]);

    PERSPECTIVE_POINTS.forEach((point) => {
      const labels = getAxisLabels(point.axis);

      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
      expect(point.leftLabel).toBe(labels.leftLabel);
      expect(point.rightLabel).toBe(labels.rightLabel);
    });
  });

  it('축마다 기준이 된 투표 수를 함께 제공한다', () => {
    const total = PERSPECTIVE_POINTS.reduce((sum, point) => sum + point.voteCount, 0);

    expect(total).toBe(PARTICIPATION_SUMMARY.patternIssueCount);

    PERSPECTIVE_POINTS.forEach((point) => {
      expect(point.voteCount).toBeGreaterThan(0);
    });
  });

  it('의견 변화 1건이 실제 이슈와 주장을 참조한다', async () => {
    expect(OPINION_CHANGES).toHaveLength(1);

    await Promise.all(
      OPINION_CHANGES.map(async (change) => {
        expect(await repository.getIssueBySlug(change.issueId)).not.toBeNull();
        expect(
          await repository.getClaimById(change.issueId, change.persuadedByClaimId),
        ).not.toBeNull();
        expect(change.before.choice).not.toBe(change.after.choice);
        expect(Date.parse(change.before.votedAt)).toBeLessThan(Date.parse(change.after.votedAt));
      }),
    );
  });
});
