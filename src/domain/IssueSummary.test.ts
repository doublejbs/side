import { describe, expect, it } from 'vitest';

import { MOCK_ISSUES } from '@/data/MockIssueRepository';
import { toIssueSummary } from '@/domain/IssueSummary';

const issue = MOCK_ISSUES[0];

describe('toIssueSummary', () => {
  it('목록·발견 화면에 필요한 값만 남긴다', () => {
    const summary = toIssueSummary(issue);

    expect(Object.keys(summary).sort()).toEqual([
      'distribution',
      'participantCount',
      'question',
      'slug',
      'tags',
    ]);
    expect(summary.slug).toBe(issue.slug);
    expect(summary.question).toBe(issue.question);
    expect(summary.distribution).toEqual(issue.distribution);
    expect(summary.tags).toEqual(issue.tags);
  });

  it('참여자 수를 함께 넘긴다', () => {
    expect(toIssueSummary(issue).participantCount).toBe(issue.participantCount);
  });
});
