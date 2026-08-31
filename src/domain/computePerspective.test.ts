import { describe, expect, it } from 'vitest';

import { AxisDirection } from '@/domain/AxisDirection';
import { computePerspective } from '@/domain/computePerspective';
import type { PerspectiveVote } from '@/domain/computePerspective';
import type { IssueAxis } from '@/domain/IssueAxis';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { ALL_PERSPECTIVE_AXES, getAxisLabels } from '@/domain/perspectiveAxisLabels';
import { VoteChoice } from '@/domain/VoteChoice';

const laborRight: IssueAxis = {
  axis: PerspectiveAxis.LABOR,
  agreeDirection: AxisDirection.RIGHT,
};

const environmentLeft: IssueAxis = {
  axis: PerspectiveAxis.ENVIRONMENT,
  agreeDirection: AxisDirection.LEFT,
};

const findPoint = (votes: PerspectiveVote[], axis: PerspectiveAxis) => {
  const point = computePerspective(votes).find((item) => item.axis === axis);

  if (!point) {
    throw new Error(`축을 찾을 수 없다: ${axis}`);
  }

  return point;
};

describe('computePerspective', () => {
  it('표가 없어도 축 5개를 라벨과 함께 돌려준다', () => {
    const points = computePerspective([]);

    expect(points.map((point) => point.axis)).toEqual(ALL_PERSPECTIVE_AXES);

    points.forEach((point) => {
      const labels = getAxisLabels(point.axis);

      expect(point.leftLabel).toBe(labels.leftLabel);
      expect(point.rightLabel).toBe(labels.rightLabel);
      expect(point.value).toBeNull();
      expect(point.voteCount).toBe(0);
    });
  });

  it('찬성은 agreeDirection 쪽 끝으로 간다', () => {
    const point = findPoint([{ axes: [laborRight], choice: VoteChoice.AGREE }], PerspectiveAxis.LABOR);

    expect(point.value).toBe(100);
    expect(point.voteCount).toBe(1);
  });

  it('반대는 agreeDirection 의 반대쪽 끝으로 간다', () => {
    const point = findPoint(
      [{ axes: [laborRight], choice: VoteChoice.DISAGREE }],
      PerspectiveAxis.LABOR,
    );

    expect(point.value).toBe(0);
  });

  it('agreeDirection 이 LEFT 면 찬성이 왼쪽 끝이다', () => {
    const point = findPoint(
      [{ axes: [environmentLeft], choice: VoteChoice.AGREE }],
      PerspectiveAxis.ENVIRONMENT,
    );

    expect(point.value).toBe(0);
  });

  it('찬반 비율만큼 중앙에서 기운다', () => {
    const point = findPoint(
      [
        { axes: [laborRight], choice: VoteChoice.AGREE },
        { axes: [laborRight], choice: VoteChoice.AGREE },
        { axes: [laborRight], choice: VoteChoice.AGREE },
        { axes: [laborRight], choice: VoteChoice.DISAGREE },
      ],
      PerspectiveAxis.LABOR,
    );

    // right 3 · left 1 → 50 + 50 * (3 - 1) / 4 = 75
    expect(point.value).toBe(75);
    expect(point.voteCount).toBe(4);
  });

  it('소수 자리는 반올림한다', () => {
    const point = findPoint(
      [
        { axes: [laborRight], choice: VoteChoice.AGREE },
        { axes: [laborRight], choice: VoteChoice.AGREE },
        { axes: [laborRight], choice: VoteChoice.DISAGREE },
      ],
      PerspectiveAxis.LABOR,
    );

    // right 2 · left 1 → 50 + 50 / 3 = 66.66… → 67
    expect(point.value).toBe(67);
  });

  it('모르겠음 표는 세지 않는다', () => {
    const point = findPoint(
      [
        { axes: [laborRight], choice: VoteChoice.UNSURE },
        { axes: [laborRight], choice: VoteChoice.AGREE },
      ],
      PerspectiveAxis.LABOR,
    );

    expect(point.value).toBe(100);
    expect(point.voteCount).toBe(1);
  });

  it('축이 없는 표는 어느 축에도 쌓이지 않는다', () => {
    const points = computePerspective([{ axes: [], choice: VoteChoice.AGREE }]);

    points.forEach((point) => {
      expect(point.value).toBeNull();
      expect(point.voteCount).toBe(0);
    });
  });

  it('축 두 개가 달린 표는 두 축 모두에 쌓인다', () => {
    const votes: PerspectiveVote[] = [
      { axes: [laborRight, environmentLeft], choice: VoteChoice.AGREE },
    ];

    expect(findPoint(votes, PerspectiveAxis.LABOR).value).toBe(100);
    expect(findPoint(votes, PerspectiveAxis.ENVIRONMENT).value).toBe(0);
    expect(findPoint(votes, PerspectiveAxis.ECONOMY).value).toBeNull();
  });
});
