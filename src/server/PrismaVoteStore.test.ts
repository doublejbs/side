import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import { PrismaVoteStore } from '@/server/PrismaVoteStore';

/**
 * `PrismaVoteStore` 가 실제로 보내는 질의만 흉내 내는 인메모리 대역.
 * (파이프라인용 `src/testing/FakePrismaClient.ts` 는 투표·피드백 모델을 다루지 않는다.)
 */
interface FakeVoteRow {
  issueId: string;
  anonId: string;
  choice: string;
}

interface FakeFeedbackRow {
  claimId: string;
  anonId: string;
  feedback: string;
}

interface FakeIssueRow {
  id: string;
  slug: string;
  status: string;
}

interface UniqueVoteWhere {
  issueId_anonId: { issueId: string; anonId: string };
}

interface UniqueFeedbackWhere {
  claimId_anonId: { claimId: string; anonId: string };
}

interface FakeDatabase {
  issues: FakeIssueRow[];
  claimIds: string[];
  votes: FakeVoteRow[];
  feedbacks: FakeFeedbackRow[];
}

interface FakeOptions {
  /** true 면 다음 `vote.upsert` 가 유니크 제약 위반으로 실패한다(동시 첫 투표 재현). */
  failNextVoteUpsert?: boolean;
}

const createUniqueConstraintError = (): Error =>
  Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

const createFakePrisma = (seed: Partial<FakeDatabase>, options: FakeOptions = {}) => {
  const db: FakeDatabase = { issues: [], claimIds: [], votes: [], feedbacks: [], ...seed };

  let shouldFailUpsert = options.failNextVoteUpsert ?? false;

  const findVote = ({ issueId_anonId: key }: UniqueVoteWhere): FakeVoteRow | undefined =>
    db.votes.find((vote) => vote.issueId === key.issueId && vote.anonId === key.anonId);

  const findFeedback = ({ claimId_anonId: key }: UniqueFeedbackWhere): FakeFeedbackRow | undefined =>
    db.feedbacks.find(
      (record) => record.claimId === key.claimId && record.anonId === key.anonId,
    );

  const prisma = {
    issue: {
      findFirst: async ({ where }: { where: { slug: string; status: string } }) => {
        const found = db.issues.find(
          (issue) => issue.slug === where.slug && issue.status === where.status,
        );

        return found ? { id: found.id } : null;
      },
    },
    vote: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: UniqueVoteWhere;
        create: FakeVoteRow;
        update: { choice: string };
      }) => {
        if (shouldFailUpsert) {
          shouldFailUpsert = false;
          db.votes.push({ ...create, choice: VoteChoice.UNSURE });

          throw createUniqueConstraintError();
        }

        const existing = findVote(where);

        if (existing) {
          existing.choice = update.choice;

          return { ...existing };
        }

        db.votes.push({ ...create });

        return { ...create };
      },
      update: async ({
        where,
        data,
      }: {
        where: UniqueVoteWhere;
        data: { choice: string };
      }) => {
        const existing = findVote(where);

        if (!existing) {
          throw new Error('투표를 찾을 수 없다');
        }

        existing.choice = data.choice;

        return { ...existing };
      },
      findUnique: async ({ where }: { where: UniqueVoteWhere }) => {
        const found = findVote(where);

        return found ? { choice: found.choice } : null;
      },
      groupBy: async ({ where }: { where: { issueId: string } }) => {
        const counts = new Map<string, number>();

        db.votes
          .filter((vote) => vote.issueId === where.issueId)
          .forEach((vote) => counts.set(vote.choice, (counts.get(vote.choice) ?? 0) + 1));

        return [...counts.entries()].map(([choice, count]) => ({
          choice,
          _count: { _all: count },
        }));
      },
    },
    claimFeedbackRecord: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: UniqueFeedbackWhere;
        create: FakeFeedbackRow;
        update: { feedback: string };
      }) => {
        const existing = findFeedback(where);

        if (existing) {
          existing.feedback = update.feedback;

          return { ...existing };
        }

        db.feedbacks.push({ ...create });

        return { ...create };
      },
      deleteMany: async ({ where }: { where: { claimId: string; anonId: string } }) => {
        const before = db.feedbacks.length;

        db.feedbacks = db.feedbacks.filter(
          (record) => !(record.claimId === where.claimId && record.anonId === where.anonId),
        );

        return { count: before - db.feedbacks.length };
      },
      findUnique: async ({ where }: { where: UniqueFeedbackWhere }) => {
        const found = findFeedback(where);

        return found ? { feedback: found.feedback } : null;
      },
    },
    claim: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        db.claimIds.includes(where.id) ? { id: where.id } : null,
    },
  };

  return { db, prisma: prisma as unknown as PrismaClient };
};

const ISSUES: FakeIssueRow[] = [
  { id: 'issue-1', slug: 'work-week-4-5', status: 'PUBLISHED' },
  { id: 'issue-2', slug: 'draft-issue', status: 'REVIEW' },
];

describe('PrismaVoteStore', () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let store: PrismaVoteStore;

  beforeEach(() => {
    fake = createFakePrisma({ issues: ISSUES, claimIds: ['claim-1'] });
    store = new PrismaVoteStore(fake.prisma);
  });

  it('발행된 이슈의 slug 만 내부 id 로 바꾼다', async () => {
    expect(await store.getIssueIdBySlug('work-week-4-5')).toBe('issue-1');
    expect(await store.getIssueIdBySlug('draft-issue')).toBeNull();
    expect(await store.getIssueIdBySlug('not-exists')).toBeNull();
  });

  it('투표를 저장하고 내 선택을 돌려준다', async () => {
    await store.castVote('issue-1', 'anon-1', VoteChoice.AGREE);

    expect(await store.getMyVote('issue-1', 'anon-1')).toBe(VoteChoice.AGREE);
    expect(await store.getMyVote('issue-1', 'anon-2')).toBeNull();
  });

  it('다시 투표해도 표는 1개만 남고 선택만 바뀐다', async () => {
    await store.castVote('issue-1', 'anon-1', VoteChoice.AGREE);
    await store.castVote('issue-1', 'anon-1', VoteChoice.DISAGREE);

    expect(fake.db.votes).toHaveLength(1);
    expect(await store.getMyVote('issue-1', 'anon-1')).toBe(VoteChoice.DISAGREE);
    expect(await store.countVotes('issue-1')).toEqual({ agree: 0, disagree: 1, unsure: 0 });
  });

  it('동시 투표로 upsert 가 유니크 제약에 걸리면 갱신으로 한 번 더 시도한다', async () => {
    const conflicting = createFakePrisma(
      { issues: ISSUES, claimIds: [] },
      { failNextVoteUpsert: true },
    );
    const conflictingStore = new PrismaVoteStore(conflicting.prisma);

    await conflictingStore.castVote('issue-1', 'anon-1', VoteChoice.AGREE);

    expect(conflicting.db.votes).toHaveLength(1);
    expect(await conflictingStore.getMyVote('issue-1', 'anon-1')).toBe(VoteChoice.AGREE);
  });

  it('유니크 제약이 아닌 오류는 그대로 올린다', async () => {
    const broken = {
      vote: {
        upsert: async () => {
          throw new Error('연결 실패');
        },
      },
    } as unknown as PrismaClient;

    await expect(
      new PrismaVoteStore(broken).castVote('issue-1', 'anon-1', VoteChoice.AGREE),
    ).rejects.toThrow('연결 실패');
  });

  it('선택지별 표 수를 집계한다', async () => {
    await store.castVote('issue-1', 'anon-1', VoteChoice.AGREE);
    await store.castVote('issue-1', 'anon-2', VoteChoice.AGREE);
    await store.castVote('issue-1', 'anon-3', VoteChoice.UNSURE);
    await store.castVote('issue-2', 'anon-4', VoteChoice.DISAGREE);

    expect(await store.countVotes('issue-1')).toEqual({ agree: 2, disagree: 0, unsure: 1 });
    expect(await store.countVotes('issue-3')).toEqual({ agree: 0, disagree: 0, unsure: 0 });
  });

  it('근거 피드백을 저장하고 바꾸고 해제한다', async () => {
    await store.setClaimFeedback('claim-1', 'anon-1', ClaimFeedback.PERSUADED);

    expect(await store.getMyClaimFeedback('claim-1', 'anon-1')).toBe(ClaimFeedback.PERSUADED);

    await store.setClaimFeedback('claim-1', 'anon-1', ClaimFeedback.LACKS_EVIDENCE);

    expect(fake.db.feedbacks).toHaveLength(1);
    expect(await store.getMyClaimFeedback('claim-1', 'anon-1')).toBe(ClaimFeedback.LACKS_EVIDENCE);

    await store.setClaimFeedback('claim-1', 'anon-1', null);

    expect(fake.db.feedbacks).toHaveLength(0);
    expect(await store.getMyClaimFeedback('claim-1', 'anon-1')).toBeNull();
  });

  it('주장 존재 여부를 확인한다', async () => {
    expect(await store.claimExists('claim-1')).toBe(true);
    expect(await store.claimExists('not-exists')).toBe(false);
  });
});
