import { describe, expect, it } from 'vitest';

import { pickMostDifferentIssue, pickMostDividedIssue } from '@/components/discover/pickDiscoverIssues';
import { MOCK_ISSUES } from '@/data/MockIssueRepository';
import { toIssueSummary } from '@/domain/IssueSummary';
import type { VoteRecord } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';

const issues = MOCK_ISSUES.map(toIssueSummary);

const createVotes = (entries: [string, VoteChoice][]): Record<string, VoteRecord> =>
  Object.fromEntries(
    entries.map(([issueId, choice]) => [
      issueId,
      { issueId, choice, votedAt: '2026-08-01T00:00:00.000Z' },
    ]),
  );

describe('pickMostDifferentIssue', () => {
  it('투표 기록이 없으면 null 을 반환한다', () => {
    expect(pickMostDifferentIssue(issues, {})).toBeNull();
  });

  it('내 선택의 전체 퍼센트가 가장 낮은 이슈를 고른다', () => {
    const votes = createVotes([
      ['work-week-4-5', VoteChoice.AGREE],
      ['ai-regulation', VoteChoice.AGREE],
      ['retirement-65', VoteChoice.AGREE],
    ]);

    expect(pickMostDifferentIssue(issues, votes)?.slug).toBe('ai-regulation');
  });

  it('아직 모르겠음 선택은 unsure 퍼센트로 비교한다', () => {
    const votes = createVotes([
      ['work-week-4-5', VoteChoice.UNSURE],
      ['nuclear-expansion', VoteChoice.DISAGREE],
    ]);

    expect(pickMostDifferentIssue(issues, votes)?.slug).toBe('work-week-4-5');
  });

  it('목록에 없는 이슈의 투표는 무시한다', () => {
    const votes = createVotes([['unknown-issue', VoteChoice.AGREE]]);

    expect(pickMostDifferentIssue(issues, votes)).toBeNull();
  });
});

describe('pickMostDividedIssue', () => {
  it('찬반 차이가 가장 작은 이슈를 고른다', () => {
    const picked = pickMostDividedIssue(issues);

    expect(picked?.slug).toBe('nuclear-expansion');
    expect(picked?.distribution).toEqual({ agree: 44, disagree: 41, unsure: 15 });
  });

  it('이슈가 없으면 null 을 반환한다', () => {
    expect(pickMostDividedIssue([])).toBeNull();
  });
});
