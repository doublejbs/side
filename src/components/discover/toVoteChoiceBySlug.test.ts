import { describe, expect, it } from 'vitest';

import {
  toVoteChoiceBySlug,
  toVoteChoiceBySlugFromRecords,
} from '@/components/discover/toVoteChoiceBySlug';
import type { MyVote } from '@/domain/MyVote';
import type { VoteRecord } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';

const MY_VOTES: MyVote[] = [
  { slug: 'work-week-4-5', choice: VoteChoice.AGREE, votedAt: '2026-08-02T00:00:00.000Z' },
  { slug: 'ai-regulation', choice: VoteChoice.DISAGREE, votedAt: '2026-08-01T00:00:00.000Z' },
];

const LOCAL_VOTES: Record<string, VoteRecord> = {
  'work-week-4-5': {
    issueId: 'work-week-4-5',
    choice: VoteChoice.UNSURE,
    votedAt: '2026-08-01T00:00:00.000Z',
  },
};

describe('toVoteChoiceBySlug', () => {
  it('서버 집계를 slug → 내 선택 맵으로 바꾼다', () => {
    expect([...toVoteChoiceBySlug(MY_VOTES)]).toEqual([
      ['work-week-4-5', VoteChoice.AGREE],
      ['ai-regulation', VoteChoice.DISAGREE],
    ]);
  });

  it('표가 없으면 빈 맵이다', () => {
    expect(toVoteChoiceBySlug([]).size).toBe(0);
  });
});

describe('toVoteChoiceBySlugFromRecords', () => {
  it('목 모드 localStorage 기록도 같은 맵으로 바꾼다', () => {
    expect([...toVoteChoiceBySlugFromRecords(LOCAL_VOTES)]).toEqual([
      ['work-week-4-5', VoteChoice.UNSURE],
    ]);
  });

  it('기록이 없으면 빈 맵이다', () => {
    expect(toVoteChoiceBySlugFromRecords({}).size).toBe(0);
  });
});
