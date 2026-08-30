import type { VoteDistribution } from '@/domain/Issue';
import { toPercentages } from '@/domain/computeDistribution';

/** 선택지별 실제 표 수. `Vote` 테이블 group by 결과. */
export interface VoteCounts {
  agree: number;
  disagree: number;
  unsure: number;
}

interface VoteAggregation {
  distribution: VoteDistribution;
  participantCount: number;
}

/**
 * 실제 표 수를 화면에 쓰는 분포(퍼센트 합 100)와 참여자 수로 집계한다.
 * 표가 하나도 없으면 분포 0/0/0 · 참여자 0을 반환한다.
 */
export const aggregateVotes = (counts: VoteCounts): VoteAggregation => {
  const participantCount = counts.agree + counts.disagree + counts.unsure;

  return {
    distribution: toPercentages(
      [
        { key: 'agree', count: counts.agree },
        { key: 'disagree', count: counts.disagree },
        { key: 'unsure', count: counts.unsure },
      ],
      participantCount,
    ),
    participantCount,
  };
};
