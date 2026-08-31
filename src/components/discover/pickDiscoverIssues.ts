import type { VoteDistribution } from '@/domain/Issue';
import type { IssueSummary } from '@/domain/IssueSummary';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceKey } from '@/domain/voteChoiceKey';

interface Candidate {
  issue: IssueSummary;
  share: number;
}

/** 내 선택과 같은 응답을 한 사람의 전체 비율(%). */
const getMyChoiceShare = (distribution: VoteDistribution, choice: VoteChoice): number =>
  distribution[getVoteChoiceKey(choice)];

/** 찬성과 반대의 퍼센트 차이(%p). */
export const getAgreeDisagreeGap = (issue: IssueSummary): number =>
  Math.abs(issue.distribution.agree - issue.distribution.disagree);

/**
 * 내가 투표한 이슈 중 내 선택의 전체 비율이 가장 낮은 이슈.
 * 내 선택은 slug 로 찾으므로 서버 집계·목 모드 기록 어느 쪽이든
 * `toVoteChoiceBySlug` 로 맞춘 맵을 넘긴다.
 */
export const pickMostDifferentIssue = (
  issues: IssueSummary[],
  choiceBySlug: Map<string, VoteChoice>,
): IssueSummary | null => {
  const candidates: Candidate[] = issues.flatMap((issue) => {
    const choice = choiceBySlug.get(issue.slug);

    if (!choice) {
      return [];
    }

    return [{ issue, share: getMyChoiceShare(issue.distribution, choice) }];
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
