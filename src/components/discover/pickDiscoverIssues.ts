import type { VoteDistribution } from '@/domain/Issue';
import type { IssueSummary } from '@/domain/IssueSummary';
import type { VoteRecord } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';

interface Candidate {
  issue: IssueSummary;
  share: number;
}

const DISTRIBUTION_KEY: Record<VoteChoice, keyof VoteDistribution> = {
  [VoteChoice.AGREE]: 'agree',
  [VoteChoice.DISAGREE]: 'disagree',
  [VoteChoice.UNSURE]: 'unsure',
};

/** 내 선택과 같은 응답을 한 사람의 전체 비율(%). */
const getMyChoiceShare = (
  distribution: VoteDistribution,
  choice: VoteChoice,
): number => distribution[DISTRIBUTION_KEY[choice]];

/** 찬성과 반대의 퍼센트 차이(%p). */
export const getAgreeDisagreeGap = (issue: IssueSummary): number =>
  Math.abs(issue.distribution.agree - issue.distribution.disagree);

/** 내가 투표한 이슈 중 내 선택의 전체 비율이 가장 낮은 이슈. 투표 기록이 없으면 null. */
export const pickMostDifferentIssue = (
  issues: IssueSummary[],
  votes: Record<string, VoteRecord>,
): IssueSummary | null => {
  const candidates: Candidate[] = issues.flatMap((issue) => {
    const vote = votes[issue.id];

    if (!vote) {
      return [];
    }

    return [{ issue, share: getMyChoiceShare(issue.distribution, vote.choice) }];
  });

  if (candidates.length === 0) {
    return null;
  }

  const picked = candidates.reduce((lowest, candidate) =>
    candidate.share < lowest.share ? candidate : lowest,
  );

  return picked.issue;
};

/** 찬반 차이가 가장 작은 이슈. 이슈가 없으면 null. */
export const pickMostDividedIssue = (issues: IssueSummary[]): IssueSummary | null => {
  if (issues.length === 0) {
    return null;
  }

  return issues.reduce((closest, issue) =>
    getAgreeDisagreeGap(issue) < getAgreeDisagreeGap(closest) ? issue : closest,
  );
};
