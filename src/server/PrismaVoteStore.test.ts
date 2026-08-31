import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { AxisDirection } from '@/domain/AxisDirection';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { VoteChoice } from '@/domain/VoteChoice';
import { PrismaVoteStore } from '@/server/PrismaVoteStore';
import { MAX_MY_VOTE_EVENTS } from '@/server/VoteStore';

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
  /** 먼저 남긴 순서를 재현할 때만 채운다. */
  createdAt?: Date;
}

interface FakeIssueRow {
  id: string;
  /** 아직 발행되지 않은 이슈는 slug 가 없다. */
  slug: string | null;
  status: string;
  question?: string;
  /** IssueAxis[]. 축이 정해지지 않았으면 없다. */
  axes?: unknown;
}

/** 투표 이력 한 건. `castVote` 가 신규·변경일 때만 만든다. */
interface FakeVoteEventRow {
  id: string;
  issueId: string;
  userId: string;
  choice: string;
  createdAt: Date;
}

/** 의견 변화에 붙일 주장 제목을 찾기 위한 최소 주장 행. */
interface FakeClaimRow {
  id: string;
  issueId: string;
  title: string;
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

/** 투표 조회는 소유자 조건에 더해 이슈 관계 조건(`issue: { status }`)을 쓴다. */
interface VoteWhere extends OwnerWhere {
  issue?: { status: string };
}

/** 근거 피드백 조회는 판정 종류로도 거른다. */
interface FeedbackWhere extends OwnerWhere {
  claimId?: string;
  feedback?: string;
}

interface FakeDatabase {
  issues: FakeIssueRow[];
  claimIds: string[];
  claims: FakeClaimRow[];
  votes: FakeVoteRow[];
  voteEvents: FakeVoteEventRow[];
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

/** `where.issue` 관계 조건(발행 상태)을 만족하는지 본다. */
const matchesIssue = (
  issues: FakeIssueRow[],
  vote: FakeVoteRow,
  where: VoteWhere,
): boolean => {
  if (!where.issue) {
    return true;
  }

  return issues.find((issue) => issue.id === vote.issueId)?.status === where.issue.status;
};

const createFakePrisma = (seed: Partial<FakeDatabase>, options: FakeOptions = {}) => {
  const db: FakeDatabase = {
    issues: [],
    claimIds: [],
    claims: [],
    votes: [],
    voteEvents: [],
    feedbacks: [],
    ...seed,
  };

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
        select,
        orderBy,
      }: {
        where: VoteWhere;
        include?: { issue: { select: { slug: true } } };
        select?: { choice?: true; issue?: { select: { axes?: true } } };
        orderBy?: { updatedAt: 'asc' | 'desc' };
      }) => {
        const rows = db.votes.filter(
          (vote) => matchesOwner(vote, where) && matchesIssue(db.issues, vote, where),
        );

        if (orderBy) {
          rows.sort((left, right) =>
            orderBy.updatedAt === 'desc'
              ? right.updatedAt.getTime() - left.updatedAt.getTime()
              : left.updatedAt.getTime() - right.updatedAt.getTime(),
          );
        }

        return rows.map((vote) => {
          const issue = db.issues.find((row) => row.id === vote.issueId);

          // 관점 계산은 이슈의 축까지 함께 고른다. 나머지 select 는 행 전체로도 충분하다.
          if (select?.issue) {
            return { choice: vote.choice, issue: { axes: issue?.axes ?? null } };
          }

          return { ...vote, ...(include ? { issue: { slug: issue?.slug ?? null } } : {}) };
        });
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
    voteEvent: {
      create: async ({ data }: { data: { issueId: string; userId: string; choice: string } }) => {
        const row: FakeVoteEventRow = { id: nextId('event'), ...data, createdAt: nextUpdatedAt() };

        db.voteEvents.push(row);

        return { ...row };
      },
      findMany: async ({
        where,
        orderBy,
        take,
      }: {
        where: { userId: string; issue?: { status: string } };
        select?: unknown;
        orderBy?: { createdAt: 'asc' | 'desc' };
        take?: number;
      }) => {
        const rows = db.voteEvents.filter((event) => {
          const issue = db.issues.find((row) => row.id === event.issueId);

          return (
            event.userId === where.userId &&
            (!where.issue || issue?.status === where.issue.status)
          );
        });
        const direction = orderBy?.createdAt === 'desc' ? -1 : 1;

        return [...rows]
          .sort(
            (left, right) => direction * (left.createdAt.getTime() - right.createdAt.getTime()),
          )
          .slice(0, take ?? rows.length)
          .map((event) => {
            const issue = db.issues.find((row) => row.id === event.issueId);

            return {
              issueId: event.issueId,
              choice: event.choice,
              createdAt: event.createdAt,
              issue: { slug: issue?.slug ?? null, question: issue?.question ?? null },
            };
          });
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

        const row: FakeFeedbackRow = {
          id: nextId('feedback'),
          ...create,
          anonId: null,
          createdAt: nextUpdatedAt(),
        };

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
      findMany: async ({
        where,
        select,
      }: {
        where: FeedbackWhere;
        select?: { claim: { select: { issueId: true; title: true } } };
        orderBy?: { createdAt: 'asc' | 'desc' };
      }) => {
        const rows = db.feedbacks
          .filter(
            (record) =>
              matchesOwner(record, where) &&
              (where.feedback === undefined || record.feedback === where.feedback),
          )
          .sort((left, right) => (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0));

        // 의견 변화는 주장 제목까지 함께 고른다. 나머지 select 는 행 전체로도 충분하다.
        if (!select?.claim) {
          return rows.map((record) => ({ ...record }));
        }

        return rows.map((record) => {
          const claim = db.claims.find((row) => row.id === record.claimId);

          return { claim: { issueId: claim?.issueId ?? '', title: claim?.title ?? '' } };
        });
      },
      count: async ({ where }: { where: FeedbackWhere }) =>
        db.feedbacks.filter((record) => matchesOwner(record, where)).length,
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
        db.claimIds.includes(where.id) || db.claims.some((claim) => claim.id === where.id)
          ? { id: where.id }
          : null,
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(prisma),
  };

  return { db, prisma: prisma as unknown as PrismaClient };
};

const ISSUES: FakeIssueRow[] = [
  {
    id: 'issue-1',
    slug: 'work-week-4-5',
    status: 'PUBLISHED',
    question: '주 4.5일제를 도입해야 할까?',
    axes: [{ axis: 'LABOR', agreeDirection: 'RIGHT' }],
  },
  { id: 'issue-2', slug: 'draft-issue', status: 'REVIEW', question: '아직 검수 중인 질문?' },
  { id: 'issue-3', slug: null, status: 'REVIEW' },
  {
    id: 'issue-4',
    slug: 'ai-regulation',
    status: 'PUBLISHED',
    question: 'AI 규제를 강화해야 할까?',
    axes: [{ axis: 'ECONOMY', agreeDirection: 'RIGHT' }],
  },
  /** 발행됐지만 slug 가 비어 있는 예외 상황(스키마상 slug 는 선택 값이다). */
  { id: 'issue-5', slug: null, status: 'PUBLISHED' },
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
        findUnique: async () => null,
        upsert: async () => {
          throw new Error('연결 실패');
        },
      },
      $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(broken),
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
    await store.castVote('issue-4', 'user-1', VoteChoice.DISAGREE);
    await store.castVote('issue-1', 'user-2', VoteChoice.UNSURE);

    const rows = await store.listMyVotes('user-1');

    expect(rows).toEqual([
      {
        issueSlug: 'ai-regulation',
        choice: VoteChoice.DISAGREE,
        votedAt: expect.any(String),
      },
      {
        issueSlug: 'work-week-4-5',
        choice: VoteChoice.AGREE,
        votedAt: expect.any(String),
      },
    ]);
    expect(rows[0].votedAt).toBe(new Date(rows[0].votedAt).toISOString());
  });

  it('아직 발행되지 않은 이슈의 표는 목록에서 뺀다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-2', 'user-1', VoteChoice.DISAGREE);
    await store.castVote('issue-3', 'user-1', VoteChoice.UNSURE);

    const rows = await store.listMyVotes('user-1');

    expect(rows.map((row) => row.issueSlug)).toEqual(['work-week-4-5']);
  });

  it('발행됐지만 slug 가 없는 이슈의 표는 issueSlug 가 null 이다', async () => {
    await store.castVote('issue-5', 'user-1', VoteChoice.AGREE);

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

describe('PrismaVoteStore 투표 이력·관점', () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let store: PrismaVoteStore;

  beforeEach(() => {
    fake = createFakePrisma({
      issues: ISSUES,
      claims: [
        { id: 'claim-1', issueId: 'issue-1', title: '노동시간이 줄어든다' },
        { id: 'claim-2', issueId: 'issue-1', title: '기업 비용이 늘어난다' },
      ],
    });
    store = new PrismaVoteStore(fake.prisma);
  });

  it('신규 투표와 선택 변경만 이력으로 남긴다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-1', 'user-1', VoteChoice.DISAGREE);

    expect(fake.db.voteEvents.map((event) => event.choice)).toEqual([
      VoteChoice.AGREE,
      VoteChoice.DISAGREE,
    ]);
  });

  it('발행된 이슈의 이력만 오래된 순으로 돌려준다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-2', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-1', 'user-1', VoteChoice.DISAGREE);
    await store.castVote('issue-1', 'user-2', VoteChoice.UNSURE);

    const rows = await store.listMyVoteEvents('user-1');

    expect(rows).toEqual([
      {
        issueId: 'issue-1',
        issueSlug: 'work-week-4-5',
        question: '주 4.5일제를 도입해야 할까?',
        choice: VoteChoice.AGREE,
        createdAt: expect.any(String),
      },
      {
        issueId: 'issue-1',
        issueSlug: 'work-week-4-5',
        question: '주 4.5일제를 도입해야 할까?',
        choice: VoteChoice.DISAGREE,
        createdAt: expect.any(String),
      },
    ]);
    expect(Date.parse(rows[0].createdAt)).toBeLessThan(Date.parse(rows[1].createdAt));
  });

  it('이력이 많으면 최근 상한만큼만 읽고 오래된 순으로 돌려준다', async () => {
    const choices = [VoteChoice.AGREE, VoteChoice.DISAGREE];

    for (let index = 0; index < MAX_MY_VOTE_EVENTS + 10; index += 1) {
      await store.castVote('issue-1', 'user-1', choices[index % choices.length]);
    }

    const rows = await store.listMyVoteEvents('user-1');
    const all = fake.db.voteEvents;

    expect(rows).toHaveLength(MAX_MY_VOTE_EVENTS);
    expect(rows[0].createdAt).toBe(all[all.length - MAX_MY_VOTE_EVENTS].createdAt.toISOString());
    expect(rows[rows.length - 1].createdAt).toBe(all[all.length - 1].createdAt.toISOString());
    expect(Date.parse(rows[0].createdAt)).toBeLessThan(Date.parse(rows[1].createdAt));
  });

  it('익명 표를 계정으로 옮길 때는 이력을 만들지 않는다', async () => {
    fake.db.votes.push({
      id: 'vote-anon',
      issueId: 'issue-1',
      anonId: 'anon-1',
      userId: null,
      choice: VoteChoice.AGREE,
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    await store.claimAnonRecords('anon-1', 'user-1');

    expect(fake.db.voteEvents).toEqual([]);
    expect(await store.listMyVoteEvents('user-1')).toEqual([]);
  });

  it('설득됐어요 를 남긴 주장만 먼저 남긴 순서로 돌려준다', async () => {
    await store.setClaimFeedback('claim-2', 'user-1', ClaimFeedback.PERSUADED);
    await store.setClaimFeedback('claim-1', 'user-1', ClaimFeedback.PERSUADED);
    await store.setClaimFeedback('claim-1', 'user-2', ClaimFeedback.PERSUADED);

    expect(await store.listMyPersuadedClaims('user-1')).toEqual([
      { issueId: 'issue-1', claimTitle: '기업 비용이 늘어난다' },
      { issueId: 'issue-1', claimTitle: '노동시간이 줄어든다' },
    ]);
  });

  it('근거 피드백 수는 판정 종류를 가리지 않고 센다', async () => {
    await store.setClaimFeedback('claim-1', 'user-1', ClaimFeedback.PERSUADED);
    await store.setClaimFeedback('claim-2', 'user-1', ClaimFeedback.LACKS_EVIDENCE);
    await store.setClaimFeedback('claim-1', 'user-2', ClaimFeedback.PERSUADED);

    expect(await store.countMyClaimFeedbacks('user-1')).toBe(2);
    expect(await store.countMyClaimFeedbacks('user-9')).toBe(0);
  });

  it('발행된 이슈의 내 최신 표를 축과 함께 돌려준다', async () => {
    await store.castVote('issue-1', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-4', 'user-1', VoteChoice.DISAGREE);
    await store.castVote('issue-2', 'user-1', VoteChoice.AGREE);
    await store.castVote('issue-5', 'user-1', VoteChoice.AGREE);

    const rows = await store.listMyVoteAxes('user-1');

    expect(rows).toEqual([
      {
        axes: [{ axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT }],
        choice: VoteChoice.AGREE,
      },
      {
        axes: [{ axis: PerspectiveAxis.ECONOMY, agreeDirection: AxisDirection.RIGHT }],
        choice: VoteChoice.DISAGREE,
      },
      // 축이 없는 이슈(issue-5)도 표는 돌려주되 어느 축에도 쌓이지 않는다.
      { axes: [], choice: VoteChoice.AGREE },
    ]);
  });
});
