import { AxisDirection } from '@/domain/AxisDirection';
import type { IssueAxis } from '@/domain/IssueAxis';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { ALL_PERSPECTIVE_AXES, getAxisLabels } from '@/domain/perspectiveAxisLabels';
import type { PerspectivePoint } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';

/** 관점 계산에 필요한 표 하나. 이슈의 축 메타데이터와 내 선택만 있으면 된다. */
export interface PerspectiveVote {
  axes: IssueAxis[];
  choice: VoteChoice;
}

/** 한 축에 쌓인 왼쪽·오른쪽 점수. */
interface AxisTally {
  left: number;
  right: number;
}

/** 축 값의 중앙(어느 쪽으로도 기울지 않은 상태). */
const AXIS_CENTER = 50;

/** 중앙에서 한쪽 끝까지의 거리. `value` 는 0~100 이다. */
const AXIS_RANGE = 50;

const createTally = (): AxisTally => ({ left: 0, right: 0 });

/**
 * 이 표가 축의 어느 쪽에 1점을 주는지 고른다.
 * 찬성은 `agreeDirection` 쪽, 반대는 그 반대쪽이다. 모르겠음은 어느 쪽도 아니다.
 */
const getVotedDirection = (
  choice: VoteChoice,
  agreeDirection: AxisDirection,
): AxisDirection | null => {
  if (choice === VoteChoice.AGREE) {
    return agreeDirection;
  }

  if (choice === VoteChoice.DISAGREE) {
    return agreeDirection === AxisDirection.LEFT ? AxisDirection.RIGHT : AxisDirection.LEFT;
  }

  return null;
};

const tallyVotes = (votes: PerspectiveVote[]): Map<PerspectiveAxis, AxisTally> => {
  const tallies = new Map<PerspectiveAxis, AxisTally>(
    ALL_PERSPECTIVE_AXES.map((axis) => [axis, createTally()]),
  );

  votes.forEach((vote) => {
    vote.axes.forEach((issueAxis) => {
      const tally = tallies.get(issueAxis.axis);
      const direction = getVotedDirection(vote.choice, issueAxis.agreeDirection);

      if (!tally || direction === null) {
        return;
      }

      if (direction === AxisDirection.LEFT) {
        tally.left += 1;

        return;
      }

      tally.right += 1;
    });
  });

  return tallies;
};

/** 표가 없는 축은 값을 만들지 않는다(화면이 마커 없이 트랙만 그린다). */
const toAxisValue = ({ left, right }: AxisTally): number | null => {
  const total = left + right;

  if (total === 0) {
    return null;
  }

  return Math.round(AXIS_CENTER + (AXIS_RANGE * (right - left)) / total);
};

/**
 * 내 최신 표들로 관점 축 5개를 계산한다. 순수 함수 — 서버는 결과를 저장하지 않는다.
 * 근거: docs/PerspectiveSpec.md 3장.
 */
export const computePerspective = (votes: PerspectiveVote[]): PerspectivePoint[] => {
  const tallies = tallyVotes(votes);

  return ALL_PERSPECTIVE_AXES.map((axis) => {
    const tally = tallies.get(axis) ?? createTally();
    const { leftLabel, rightLabel } = getAxisLabels(axis);

    return {
      axis,
      leftLabel,
      rightLabel,
      value: toAxisValue(tally),
      voteCount: tally.left + tally.right,
    };
  });
};
