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
  id: string;
  issueId: string;
  anonId: string | null;
  userId: string | null;
  choice: string;
  updatedAt: Date;
}

interface FakeFeedbackRow {
  id: string;
  claimId: string;
  anonId: string | null;
  userId: string | null;
  feedback: string;
}

interface FakeIssueRow {
  id: string;
  /** 아직 발행되지 않은 이슈는 slug 가 없다. */
  slug: string | null;
  status: string;
}

interface UniqueVoteWhere {
  issueId_userId: { issueId: string; userId: string };
}

interface UniqueFeedbackWhere {
  claimId_userId: { claimId: string; userId: string };
}

interface OwnerWhere {
  id?: { in: string[] };
  anonId?: string | null;
  userId?: string | null;
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

/** `where` 에 담긴 조건(id 목록·anonId·userId)을 모두 만족하는지 본다. */
const matchesOwner = (
  row: { id: string; anonId: string | null; userId: string | null },
  where: OwnerWhere,
): boolean => {
  if (where.id && !where.id.in.includes(row.id)) {
    return false;
  }

  if (where.anonId !== undefined && row.anonId !== where.anonId) {
    return false;
  }

  if (where.userId !== undefined && row.userId !== where.userId) {
    return false;
  }

  return true;
};

const createFakePrisma = (seed: Partial<FakeDatabase>, options: FakeOptions = {}) => {
  const db: FakeDatabase = { issues: [], claimIds: [], votes: [], feedbacks: [], ...seed };

  let shouldFailUpsert = options.failNextVoteUpsert ?? false;
  let sequence = 0;
  let clock = 0;

  const nextId = (prefix: string): string => {
    sequence += 1;

    return `${prefix}-${sequence}`;
  };

  /** 쓸 때마다 1초씩 흐르는 시계. `updatedAt` 정렬을 결정적으로 만든다. */
  const nextUpdatedAt = (): Date => {
    clock += 1;

    return new Date(Date.UTC(2026, 7, 1) + clock * 1000);
  };

  const findVote = ({ issueId_userId: key }: UniqueVoteWhere): FakeVoteRow | undefined =>
    db.votes.find((vote) => vote.issueId === key.issueId && vote.userId === key.userId);

  const findFeedback = ({ claimId_userId: key }: UniqueFeedbackWhere): FakeFeedbackRow | undefined =>
    db.feedbacks.find((record) => record.claimId === key.claimId && record.userId === key.userId);

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
        create: { issueId: string; userId: string; choice: string };
        update: { choice: string };
      }) => {
        if (shouldFailUpsert) {
          shouldFailUpsert = false;
          db.votes.push({
            id: nextId('vote'),
            ...create,
            anonId: null,
            choice: VoteChoice.UNSURE,
            updatedAt: nextUpdatedAt(),
          });

          throw createUniqueConstraintError();
        }

        const existing = findVote(where);

        if (existing) {
          existing.choice = update.choice;
          existing.updatedAt = nextUpdatedAt();

          return { ...existing };
        }

        const row: FakeVoteRow = {
          id: nextId('vote'),
          ...create,
          anonId: null,
          updatedAt: nextUpdatedAt(),
        };

        db.votes.push(row);

        return { ...row };
      },
      update: async ({ where, data }: { where: UniqueVoteWhere; data: { choice: string } }) => {
        const existing = findVote(where);

        if (!existing) {
          throw new Error('투표를 찾을 수 없다');
        }

        existing.choice = data.choice;
        existing.updatedAt = nextUpdatedAt();

        return { ...existing };
      },
      findUnique: async ({ where }: { where: UniqueVoteWhere }) => {
        const found = findVote(where);

        return found ? { choice: found.choice } : null;
      },
      findMany: async ({
        where,
        include,
        orderBy,
      }: {
        where: OwnerWhere;
        include?: { issue: { select: { slug: true } } };
        orderBy?: { updatedAt: 'asc' | 'desc' };
      }) => {
        const rows = db.votes.filter((vote) => matchesOwner(vote, where));

        if (orderBy) {
          rows.sort((left, right) =>
            orderBy.updatedAt === 'desc'
              ? right.updatedAt.getTime() - left.updatedAt.getTime()
              : left.updatedAt.getTime() - right.updatedAt.getTime(),
          );
        }

        return rows.map((vote) => ({
          ...vote,
          ...(include
            ? { issue: { slug: db.issues.find((issue) => issue.id === vote.issueId)?.slug ?? null } }
            : {}),
        }));
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: OwnerWhere;
        data: { userId: string; anonId: null };
      }) => {
        const targets = db.votes.filter((vote) => matchesOwner(vote, where));

        targets.forEach((target) => Object.assign(target, data));

        return { count: targets.length };
      },
      deleteMany: async ({ where }: { where: OwnerWhere }) => {
        const before = db.votes.length;

        db.votes = db.votes.filter((vote) => !matchesOwner(vote, where));

        return { count: before - db.votes.length };
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
        create: { claimId: string; userId: string; feedback: string };
        update: { feedback: string };
      }) => {
        const existing = findFeedback(where);

        if (existing) {
          existing.feedback = update.feedback;

          return { ...existing };
        }

        const row: FakeFeedbackRow = { id: nextId('feedback'), ...create, anonId: null };

        db.feedbacks.push(row);

        return { ...row };
      },
      deleteMany: async ({ where }: { where: OwnerWhere & { claimId?: string } }) => {
        const before = db.feedbacks.length;

        db.feedbacks = db.feedbacks.filter(
          (record) =>
            !(
              (where.claimId === undefined || record.claimId === where.claimId) &&
              matchesOwner(record, where)
            ),
        );

        return { count: before - db.feedbacks.length };
      },
      findUnique: async ({ where }: { where: UniqueFeedbackWhere }) => {
        const found = findFeedback(where);

        return found ? { feedback: found.feedback } : null;
      },
      findMany: async ({ where }: { where: OwnerWhere }) =>
        db.feedbacks.filter((record) => matchesOwner(record, where)).map((record) => ({ ...record })),
      updateMany: async ({
        where,
        data,
      }: {
        where: OwnerWhere;
        data: { userId: string; anonId: null };
      }) => {
        const targets = db.feedbacks.filter((record) => matchesOwner(record, where));

        targets.forEach((target) => Object.assign(target, data));

        return { count: targets.length };
      },
    },
    claim: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        db.claimIds.includes(where.id) ? { id: where.id } : null,
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(prisma),
  };

  return { db, prisma: prisma as unknown as PrismaClient };
};

const ISSUES: FakeIssueRow[] = [
  { id: 'issue-1', slug: 'work-week-4-5', status: 'PUBLISHED' },
  { id: 'issue-2', slug: 'draft-issue', status: 'REVIEW' },
  { id: 'issue-3', slug: null, status: 'REVIEW' },
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

  it('투표를 userId 로 저장하고 내 선택을 돌려준다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);

    expect(fake.db.votes).toEqual([
      {
        id: 'vote-1',
        issueId: 'issue-1',
        anonId: null,
        userId: 'user-1',
        choice: VoteChoice.AGREE,
        updatedAt: expect.any(Date),
      },
    ]);
    expect(await store.getMyVote('issue-1', 'user-1')).toBe(VoteChoice.AGREE);
    expect(await store.getMyVote('issue-1', 'user-2')).toBeNull();
  });

  it('다시 투표해도 표는 1개만 남고 선택만 바뀐다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-1', 'user-1', VoteChoice.DISAGREE);

    expect(fake.db.votes).toHaveLength(1);
    expect(await store.getMyVote('issue-1', 'user-1')).toBe(VoteChoice.DISAGREE);
    expect(await store.countVotes('issue-1')).toEqual({ agree: 0, disagree: 1, unsure: 0 });
  });

  it('동시 투표로 upsert 가 유니크 제약에 걸리면 갱신으로 한 번 더 시도한다', async () => {
    const conflicting = createFakePrisma(
      { issues: ISSUES, claimIds: [] },
      { failNextVoteUpsert: true },
    );
    const conflictingStore = new PrismaVoteStore(conflicting.prisma);

    await conflictingStore.castVote('issue-1', 'user-1', VoteChoice.AGREE);

    expect(conflicting.db.votes).toHaveLength(1);
    expect(await conflictingStore.getMyVote('issue-1', 'user-1')).toBe(VoteChoice.AGREE);
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
      new PrismaVoteStore(broken).castVote('issue-1', 'user-1', VoteChoice.AGREE),
    ).rejects.toThrow('연결 실패');
  });

  it('선택지별 표 수를 집계한다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-1', 'user-2', VoteChoice.AGREE);
    await store.castVote('issue-1', 'user-3', VoteChoice.UNSURE);
    await store.castVote('issue-2', 'user-4', VoteChoice.DISAGREE);

    expect(await store.countVotes('issue-1')).toEqual({ agree: 2, disagree: 0, unsure: 1 });
    expect(await store.countVotes('issue-3')).toEqual({ agree: 0, disagree: 0, unsure: 0 });
  });

  it('아직 이전되지 않은 익명 표도 집계에 넣는다', async () => {
    fake.db.votes.push({
      id: 'vote-legacy',
      issueId: 'issue-1',
      anonId: 'anon-1',
      userId: null,
      choice: VoteChoice.DISAGREE,
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);

    expect(await store.countVotes('issue-1')).toEqual({ agree: 1, disagree: 1, unsure: 0 });
  });

  it('내 표를 최근에 바꾼 순서로 slug 와 함께 돌려준다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-2', 'user-1', VoteChoice.DISAGREE);
    await store.castVote('issue-1', 'user-2', VoteChoice.UNSURE);

    const rows = await store.listMyVotes('user-1');

    expect(rows).toEqual([
      {
        issueId: 'issue-2',
        issueSlug: 'draft-issue',
        choice: VoteChoice.DISAGREE,
        votedAt: expect.any(String),
      },
      {
        issueId: 'issue-1',
        issueSlug: 'work-week-4-5',
        choice: VoteChoice.AGREE,
        votedAt: expect.any(String),
      },
    ]);
    expect(rows[0].votedAt).toBe(new Date(rows[0].votedAt).toISOString());
  });

  it('slug 가 없는 이슈의 표는 issueSlug 가 null 이다', async () => {
    await store.castVote('issue-3', 'user-1', VoteChoice.AGREE);

    expect((await store.listMyVotes('user-1'))[0].issueSlug).toBeNull();
  });

  it('투표한 적이 없으면 빈 목록이다', async () => {
    await expect(store.listMyVotes('user-9')).resolves.toEqual([]);
  });

  it('근거 피드백을 저장하고 바꾸고 해제한다', async () => {
    await store.setClaimFeedback('claim-1', 'user-1', ClaimFeedback.PERSUADED);

    expect(await store.getMyClaimFeedback('claim-1', 'user-1')).toBe(ClaimFeedback.PERSUADED);

    await store.setClaimFeedback('claim-1', 'user-1', ClaimFeedback.LACKS_EVIDENCE);

    expect(fake.db.feedbacks).toHaveLength(1);
    expect(await store.getMyClaimFeedback('claim-1', 'user-1')).toBe(ClaimFeedback.LACKS_EVIDENCE);

    await store.setClaimFeedback('claim-1', 'user-1', null);

    expect(fake.db.feedbacks).toHaveLength(0);
    expect(await store.getMyClaimFeedback('claim-1', 'user-1')).toBeNull();
  });

  it('주장 존재 여부를 확인한다', async () => {
    expect(await store.claimExists('claim-1')).toBe(true);
    expect(await store.claimExists('not-exists')).toBe(false);
  });
});

describe('PrismaVoteStore 익명 레코드 이전', () => {
  const seedLegacy = () => {
    const fake = createFakePrisma({ issues: ISSUES, claimIds: ['claim-1'] });

    fake.db.votes.push({
      id: 'vote-anon',
      issueId: 'issue-1',
      anonId: 'anon-1',
      userId: null,
      choice: VoteChoice.AGREE,
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    fake.db.feedbacks.push({
      id: 'feedback-anon',
      claimId: 'claim-1',
      anonId: 'anon-1',
      userId: null,
      feedback: ClaimFeedback.PERSUADED,
    });

    return fake;
  };

  it('익명 표와 피드백을 계정으로 옮기고 anonId 를 비운다', async () => {
    const fake = seedLegacy();
    const store = new PrismaVoteStore(fake.prisma);

    expect(await store.claimAnonRecords('anon-1', 'user-1')).toEqual({ votes: 1, feedbacks: 1 });
    expect(fake.db.votes).toEqual([
      {
        id: 'vote-anon',
        issueId: 'issue-1',
        anonId: null,
        userId: 'user-1',
        choice: VoteChoice.AGREE,
        updatedAt: expect.any(Date),
      },
    ]);
    expect(fake.db.feedbacks[0]).toMatchObject({ anonId: null, userId: 'user-1' });
    expect(await store.getMyVote('issue-1', 'user-1')).toBe(VoteChoice.AGREE);
  });

  it('계정 레코드가 이미 있으면 익명 레코드를 지운다', async () => {
    const fake = seedLegacy();
    const store = new PrismaVoteStore(fake.prisma);

    await store.castVote('issue-1', 'user-1', VoteChoice.DISAGREE);
    await store.setClaimFeedback('claim-1', 'user-1', ClaimFeedback.NOT_PERSUADED);

    expect(await store.claimAnonRecords('anon-1', 'user-1')).toEqual({ votes: 0, feedbacks: 0 });
    expect(fake.db.votes).toHaveLength(1);
    expect(await store.getMyVote('issue-1', 'user-1')).toBe(VoteChoice.DISAGREE);
    expect(fake.db.feedbacks).toHaveLength(1);
    expect(await store.getMyClaimFeedback('claim-1', 'user-1')).toBe(ClaimFeedback.NOT_PERSUADED);
  });

  it('옮길 익명 레코드가 없으면 아무것도 바꾸지 않는다', async () => {
    const fake = seedLegacy();
    const store = new PrismaVoteStore(fake.prisma);

    expect(await store.claimAnonRecords('anon-other', 'user-1')).toEqual({
      votes: 0,
      feedbacks: 0,
    });
    expect(fake.db.votes[0].anonId).toBe('anon-1');
    expect(fake.db.feedbacks[0].anonId).toBe('anon-1');
  });
});
