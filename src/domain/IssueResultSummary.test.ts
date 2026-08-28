import { describe, expect, it } from 'vitest';

import { getIssues } from '@/data/IssueRepository';
import { toIssueResultSummary } from '@/domain/IssueResultSummary';

const issue = getIssues()[0];

describe('toIssueResultSummary', () => {
  it('투표 결과 화면에 필요한 값만 남긴다', () => {
    const summary = toIssueResultSummary(issue);

    expect(Object.keys(summary).sort()).toEqual([
      'claims',
      'distribution',
      'id',
      'opinionGroups',
      'participantCount',
      'question',
    ]);
    expect(summary.id).toBe(issue.id);
    expect(summary.question).toBe(issue.question);
    expect(summary.participantCount).toBe(issue.participantCount);
    expect(summary.distribution).toEqual(issue.distribution);
    expect(summary.opinionGroups).toEqual(issue.opinionGroups);
  });

  it('주장은 근거 원문 대신 근거 수만 담는다', () => {
    const summary = toIssueResultSummary(issue);

    expect(summary.claims).toHaveLength(issue.claims.length);

    summary.claims.forEach((claim, index) => {
      expect(claim).toEqual({
        id: issue.claims[index].id,
        side: issue.claims[index].side,
        title: issue.claims[index].title,
        evidenceCount: issue.claims[index].evidences.length,
      });
    });
  });
});
