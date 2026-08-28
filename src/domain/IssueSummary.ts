import type { Issue, VoteDistribution } from '@/domain/Issue';

/**
 * 목록·발견 화면에서 쓰는 경량 이슈 정보.
 * 근거 원문·언론 관점 같은 상세 데이터를 클라이언트 번들로 넘기지 않기 위해 사용한다.
 */
export interface IssueSummary {
  id: string;
  question: string;
  distribution: VoteDistribution;
  tags: string[];
}

export const toIssueSummary = (issue: Issue): IssueSummary => ({
  id: issue.id,
  question: issue.question,
  distribution: issue.distribution,
  tags: issue.tags,
});
