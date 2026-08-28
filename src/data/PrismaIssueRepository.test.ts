import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { PrismaIssueRepository } from '@/data/PrismaIssueRepository';
import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';

/**
 * `PrismaIssueRepository` 가 실제로 보내는 질의만 흉내 내는 인메모리 대역.
 * 관계 카운트(`_count`)와 `distinct` 는 넘어온 조건을 그대로 적용해,
 * 리포지토리가 행 전량 대신 카운트를 요청하는지까지 확인한다.
 */
interface SeedEvidence {
  id: string;
  type: string;
  source: string;
  date: Date;
  summary: string;
  url: string;
}

interface SeedClaim {
  id: string;
  side: string;
  order: number;
  title: string;
  description: string;
  /** 피드백 종류 목록. `_count.feedbacks` 의 where 조건을 이 목록에 적용한다. */
  feedbacks: string[];
  evidences: SeedEvidence[];
}

interface SeedIssue {
  id: string;
  slug: string | null;
  status: string;
  publishedAt: Date | null;
  question: string;
  claims: SeedClaim[];
}

interface SeedArticle {
  issueId: string;
  publisher: string | null;
}

interface SeedVote {
  issueId: string;
  choice: string;
}

interface Seed {
  issues: SeedIssue[];
  articles: SeedArticle[];
  votes: SeedVote[];
}

interface IssueWhere {
  status?: string;
  slug?: string | { not: null };
}

interface IssueSelect {
  claims?: { select?: { _count?: { select?: { feedbacks?: { where?: { feedback?: string } } } } } };
}

const KEY_SEPARATOR = '__';

const createEvidence = (id: string): SeedEvidence => ({
  id,
  type: 'FACT',
  source: '국회 입법조사처',
  date: new Date('2026-07-14T02:30:00.000Z'),
  summary: `근거 ${id}`,
  url: `https://example.com/${id}`,
});

const createClaim = (overrides: Partial<SeedClaim> & { id: string }): SeedClaim => ({
  side: 'AGREE',
  order: 1,
  title: `주장 ${overrides.id}`,
  description: '설명이다.',
  feedbacks: [],
  evidences: [createEvidence(`${overrides.id}-evidence`)],
  ...overrides,
});

const createFakePrisma = (seed: Seed) => {
  let shouldFail = false;

  const matchesIssue = (issue: SeedIssue, where: IssueWhere | undefined): boolean => {
    if (!where) {
      return true;
    }

    if (where.status !== undefined && issue.status !== where.status) {
      return false;
    }

    if (typeof where.slug === 'string' && issue.slug !== where.slug) {
      return false;
    }

    if (typeof where.slug === 'object' && issue.slug === null) {
      return false;
    }

    return true;
  };

  const toRow = (issue: SeedIssue, select: IssueSelect | undefined) => {
    const feedbackFilter = select?.claims?.select?._count?.select?.feedbacks?.where?.feedback;

    return {
      id: issue.id,
      slug: issue.slug,
      question: issue.question,
      tags: ['노동'],
      summary: ['첫 문장이다.'],
      keyPoints: [],
      commonCoverage: [],
      mediaPerspectives: [],
      opinionGroups: [],
      claims: issue.claims.map((claim) => ({
        id: claim.id,
        side: claim.side,
        order: claim.order,
        title: claim.title,
        description: claim.description,
        evidences: claim.evidences,
        _count: {
          feedbacks: claim.feedbacks.filter(
            (feedback) => feedbackFilter === undefined || feedback === feedbackFilter,
          ).length,
        },
      })),
      _count: {
        articles: seed.articles.filter((article) => article.issueId === issue.id).length,
      },
    };
  };

  const prisma = {
    issue: {
      findMany: async ({
        where,
        select,
        orderBy,
      }: {
        where?: IssueWhere;
        select?: IssueSelect;
        orderBy?: { publishedAt: 'asc' | 'desc' };
      }) => {
        if (shouldFail) {
          throw new Error('DB 에 연결할 수 없다');
        }

        const rows = seed.issues.filter((issue) => matchesIssue(issue, where));
        const ordered = orderBy
          ? [...rows].sort(
              (left, right) =>
                (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0),
            )
          : rows;

        return ordered.map((issue) => toRow(issue, select));
      },
      findFirst: async ({ where, select }: { where?: IssueWhere; select?: IssueSelect }) => {
        const found = seed.issues.find((issue) => matchesIssue(issue, where));

        return found ? toRow(found, select) : null;
      },
    },
    claim: {
      findMany: async ({ where }: { where: { issue: IssueWhere } }) => {
        if (shouldFail) {
          throw new Error('DB 에 연결할 수 없다');
        }

        return seed.issues
          .filter((issue) => matchesIssue(issue, where.issue))
          .flatMap((issue) =>
            issue.claims.map((claim) => ({ id: claim.id, issue: { slug: issue.slug } })),
          );
      },
    },
    article: {
      findMany: async ({
        where,
        distinct,
      }: {
        where: { issueId: { in: string[] }; publisher?: { not: null } };
        distinct?: string[];
      }) => {
        const rows = seed.articles.filter(
          (article) =>
            where.issueId.in.includes(article.issueId) &&
            (where.publisher === undefined || article.publisher !== null),
        );

        if (!distinct) {
          return rows;
        }

        const seen = new Set<string>();

        return rows.filter((article) => {
          const key = distinct
            .map((field) => String(article[field as keyof SeedArticle]))
            .join(KEY_SEPARATOR);

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);

          return true;
        });
      },
    },
    vote: {
      groupBy: async ({ where }: { where: { issueId: { in: string[] } } }) => {
        const counts = new Map<string, number>();

        seed.votes
          .filter((vote) => where.issueId.in.includes(vote.issueId))
          .forEach((vote) => {
            const key = `${vote.issueId}${KEY_SEPARATOR}${vote.choice}`;

            counts.set(key, (counts.get(key) ?? 0) + 1);
          });

        return [...counts.entries()].map(([key, count]) => {
          const [issueId, choice] = key.split(KEY_SEPARATOR);

          return { issueId, choice, _count: { _all: count } };
        });
      },
    },
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    breakConnection: () => {
      shouldFail = true;
    },
  };
};

const SEED: Seed = {
  issues: [
    {
      id: 'issue-1',
      slug: 'work-week-4-5',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-08-20T00:00:00.000Z'),
      question: '주 4.5일제를 도입해야 할까?',
      claims: [
        createClaim({ id: 'claim-2', side: 'DISAGREE', feedbacks: ['PERSUADED', 'NOT_PERSUADED'] }),
        createClaim({
          id: 'claim-1',
          side: 'AGREE',
          feedbacks: ['PERSUADED', 'PERSUADED', 'LACKS_EVIDENCE'],
        }),
      ],
    },
    {
      id: 'issue-2',
      slug: 'nuclear-expansion',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-08-26T00:00:00.000Z'),
      question: '원전을 늘려야 할까?',
      claims: [createClaim({ id: 'claim-3' })],
    },
    {
      id: 'issue-3',
      slug: null,
      status: 'REVIEW',
      publishedAt: null,
      question: '아직 검수 중인 이슈?',
      claims: [createClaim({ id: 'claim-4' })],
    },
  ],
  articles: [
    { issueId: 'issue-1', publisher: '한겨레' },
    { issueId: 'issue-1', publisher: '조선일보' },
    { issueId: 'issue-1', publisher: '한겨레' },
    { issueId: 'issue-1', publisher: null },
    { issueId: 'issue-2', publisher: '중앙일보' },
    { issueId: 'issue-3', publisher: '경향신문' },
  ],
  votes: [
    { issueId: 'issue-1', choice: 'AGREE' },
    { issueId: 'issue-1', choice: 'AGREE' },
    { issueId: 'issue-1', choice: 'DISAGREE' },
    { issueId: 'issue-1', choice: 'UNSURE' },
  ],
};

const createRepository = () => {
  const fake = createFakePrisma(SEED);

  return { repository: new PrismaIssueRepository(fake.prisma), fake };
};

describe('PrismaIssueRepository', () => {
  it('발행된 이슈만 최신 발행 순으로 돌려준다', async () => {
    const { repository } = createRepository();
    const issues = await repository.listPublishedIssues();

    expect(issues.map((issue) => issue.slug)).toEqual(['nuclear-expansion', 'work-week-4-5']);
  });

  it('분포와 참여자 수를 Vote 집계로 만든다', async () => {
    const { repository } = createRepository();
    const issues = await repository.listPublishedIssues();
    const workWeek = issues.find((issue) => issue.slug === 'work-week-4-5');

    expect(workWeek?.participantCount).toBe(4);
    expect(workWeek?.distribution).toEqual({ agree: 50, disagree: 25, unsure: 25 });
  });

  it('표가 없는 이슈는 분포 0 · 참여자 0 이다', async () => {
    const { repository } = createRepository();
    const nuclear = await repository.getIssueBySlug('nuclear-expansion');

    expect(nuclear?.participantCount).toBe(0);
    expect(nuclear?.distribution).toEqual({ agree: 0, disagree: 0, unsure: 0 });
  });

  it('기사 수·매체 수·설득됐어요 수를 카운트에서 만든다', async () => {
    const { repository } = createRepository();
    const issue = await repository.getIssueBySlug('work-week-4-5');

    expect(issue?.sourceArticleCount).toBe(4);
    expect(issue?.mediaOutletCount).toBe(2);
    expect(issue?.claims.map((claim) => claim.persuadedCount)).toEqual([2, 1]);
  });

  it('주장은 찬성이 먼저 오고 근거를 함께 담는다', async () => {
    const { repository } = createRepository();
    const issue = await repository.getIssueBySlug('work-week-4-5');

    expect(issue?.claims.map((claim) => claim.side)).toEqual([ClaimSide.AGREE, ClaimSide.DISAGREE]);
    expect(issue?.claims[0].evidences[0].type).toBe(EvidenceType.FACT);
  });

  it('발행되지 않은 이슈는 조회되지 않는다', async () => {
    const { repository } = createRepository();

    expect(await repository.getIssueBySlug('not-exists')).toBeNull();
    expect(await repository.listSlugs()).toEqual(['work-week-4-5', 'nuclear-expansion']);
  });

  it('주장을 slug 와 id 로 조회한다', async () => {
    const { repository } = createRepository();

    expect((await repository.getClaimById('work-week-4-5', 'claim-1'))?.id).toBe('claim-1');
    expect(await repository.getClaimById('work-week-4-5', 'not-exists')).toBeNull();
  });

  it('정적 경로용 주장 조합을 한 번에 모은다', async () => {
    const { repository } = createRepository();

    expect(await repository.listClaimParams()).toEqual([
      { slug: 'work-week-4-5', claimId: 'claim-2' },
      { slug: 'work-week-4-5', claimId: 'claim-1' },
      { slug: 'nuclear-expansion', claimId: 'claim-3' },
    ]);
  });

  it('빌드 시점에 DB 에 연결할 수 없으면 정적 경로 목록이 비어 있다', async () => {
    const { repository, fake } = createRepository();

    fake.breakConnection();

    expect(await repository.listSlugs()).toEqual([]);
    expect(await repository.listClaimParams()).toEqual([]);
  });
});
