import type { PrismaClient } from '@prisma/client';

import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import type { IssueClassification } from '@/domain/IssueClassification';
import { IssueStatus } from '@/domain/IssueStatus';
import { PIPELINE_TRANSACTION_OPTIONS } from '@/pipeline/transactionOptions';
import { AdminActionError } from '@/server/AdminActionError';
import { AdminMessage } from '@/server/AdminMessage';
import { RESTORED_DEBATE_SCORE } from '@/server/AdminStore';
import { PrismaAdminStore } from '@/server/PrismaAdminStore';

/**
 * `PrismaAdminStore` 가 실제로 보내는 질의만 흉내 내는 인메모리 대역.
 * (파이프라인용 `src/testing/FakePrismaClient.ts` 는 관리자 목록의 `_count` 를 다루지 않는다.)
 */
interface FakeIssueRow {
  id: string;
  status: string;
  slug: string | null;
  question: string;
  tags: string[];
  summary: string[];
  keyPoints: unknown;
  commonCoverage: string[];
  mediaPerspectives: unknown;
  opinionGroups: unknown;
  reviewNote: string | null;
  classification: unknown;
  debateScore: number | null;
  topic: string | null;
  classifiedAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
  publishedAt: Date | null;
}

interface FakeEvidenceRow {
  id: string;
  type: string;
  source: string;
  date: Date;
  summary: string;
  url: string;
  support: string | null;
  verificationNote: string | null;
}

interface FakeUpdate {
  where: { id: string };
  data: Record<string, unknown>;
}

const CLASSIFICATION: IssueClassification = {
  isPolicyDebate: true,
  debateScore: 82,
  topic: '노동',
  reason: '정년 연장은 찬반이 갈리는 정책 사안이다.',
  entities: ['고용노동부'],
  keySentences: ['정년 연장 논의가 본격화됐다.'],
  keyClaims: ['정년을 연장해야 한다.'],
  duplicateOfIssueId: 'issue-9',
};

const createIssueRow = (overrides: Partial<FakeIssueRow> = {}): FakeIssueRow => ({
  id: 'issue-1',
  status: IssueStatus.AUTO_REJECTED,
  slug: null,
  question: '정년을 연장해야 할까?',
  tags: ['노동'],
  summary: ['문장 1'],
  keyPoints: [],
  commonCoverage: [],
  mediaPerspectives: [],
  opinionGroups: [],
  reviewNote: '[자동 제외] 정책 논쟁이 아니다',
  classification: CLASSIFICATION,
  debateScore: 21,
  topic: '노동',
  classifiedAt: new Date('2026-01-02T00:00:00.000Z'),
  verifiedAt: new Date('2026-01-03T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  publishedAt: null,
  ...overrides,
});

const createEvidenceRow = (overrides: Partial<FakeEvidenceRow> = {}): FakeEvidenceRow => ({
  id: 'evidence-1',
  type: EvidenceType.FACT,
  source: '매체',
  date: new Date('2026-01-01T00:00:00.000Z'),
  summary: '근거 요약',
  url: 'https://example.com/1',
  support: EvidenceSupport.PARTIAL,
  verificationNote: '일부만 뒷받침한다.',
  ...overrides,
});

const createFakePrisma = (issues: FakeIssueRow[], evidences: FakeEvidenceRow[]) => {
  const updates: FakeUpdate[] = [];

  const prisma = {
    issue: {
      findMany: async ({ where }: { where: { status: string } }) =>
        issues
          .filter((issue) => issue.status === where.status)
          .map((issue) => ({ ...issue, _count: { articles: 3, claims: 6 } })),
      findUnique: async ({ where }: { where: { id: string } }) => {
        const issue = issues.find((candidate) => candidate.id === where.id);

        if (!issue) {
          return null;
        }

        return {
          ...issue,
          claims: [
            {
              id: 'claim-1',
              side: ClaimSide.AGREE,
              order: 1,
              title: '찬성 주장',
              description: '설명',
              evidences,
            },
          ],
          articles: [],
        };
      },
      update: async (args: FakeUpdate) => {
        updates.push(args);

        return {};
      },
    },
  };

  return { prisma: prisma as unknown as PrismaClient, updates };
};

describe('PrismaAdminStore.listIssues', () => {
  it('점수·주제와 중복 경고 여부를 함께 담는다', async () => {
    const { prisma } = createFakePrisma([createIssueRow()], []);

    const [item] = await new PrismaAdminStore(prisma).listIssues(IssueStatus.AUTO_REJECTED);

    expect(item).toMatchObject({
      debateScore: 21,
      topic: '노동',
      hasDuplicateWarning: true,
      articleCount: 3,
      claimCount: 6,
    });
  });

  it('분류가 없거나 형식이 깨졌으면 중복 경고를 붙이지 않는다', async () => {
    const { prisma } = createFakePrisma(
      [
        createIssueRow({ id: 'issue-1', classification: null, debateScore: null, topic: null }),
        createIssueRow({ id: 'issue-2', classification: { broken: true } }),
      ],
      [],
    );

    const items = await new PrismaAdminStore(prisma).listIssues(IssueStatus.AUTO_REJECTED);

    expect(items.map((item) => item.hasDuplicateWarning)).toEqual([false, false]);
    expect(items[0]).toMatchObject({ debateScore: null, topic: null });
  });
});

describe('PrismaAdminStore.getIssue', () => {
  it('분류 전문과 분류·검증 시각을 그대로 넘긴다', async () => {
    const { prisma } = createFakePrisma([createIssueRow()], []);

    const issue = await new PrismaAdminStore(prisma).getIssue('issue-1');

    expect(issue?.classification).toEqual(CLASSIFICATION);
    expect(issue?.debateScore).toBe(21);
    expect(issue?.topic).toBe('노동');
    expect(issue?.classifiedAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
    expect(issue?.verifiedAt).toEqual(new Date('2026-01-03T00:00:00.000Z'));
  });

  it('근거의 검증 판정과 메모를 함께 읽는다', async () => {
    const { prisma } = createFakePrisma(
      [createIssueRow()],
      [
        createEvidenceRow(),
        createEvidenceRow({ id: 'evidence-2', support: null, verificationNote: null }),
      ],
    );

    const evidences = (await new PrismaAdminStore(prisma).getIssue('issue-1'))?.claims[0]
      ?.evidences;

    expect(evidences?.[0]).toMatchObject({
      support: EvidenceSupport.PARTIAL,
      verificationNote: '일부만 뒷받침한다.',
    });
    expect(evidences?.[1]).toMatchObject({ support: null, verificationNote: null });
  });

  it('분류 Json 이 깨져 있어도 폼을 열 수 있다', async () => {
    const { prisma } = createFakePrisma([createIssueRow({ classification: { broken: true } })], []);

    expect((await new PrismaAdminStore(prisma).getIssue('issue-1'))?.classification).toBeNull();
  });
});

describe('PrismaAdminStore.restoreIssue', () => {
  it('상태와 점수만 바꾸고 검수 메모·분류 시각은 건드리지 않는다', async () => {
    const { prisma, updates } = createFakePrisma([createIssueRow()], []);

    await new PrismaAdminStore(prisma).restoreIssue('issue-1');

    expect(updates).toEqual([
      {
        where: { id: 'issue-1' },
        data: { status: IssueStatus.DRAFT, debateScore: RESTORED_DEBATE_SCORE },
      },
    ]);
  });
});

interface FakeArticleRow {
  id: string;
  issueId: string | null;
  embedding: number[];
}

/** 병합·centroid 질의만 흉내 내는 대역. 트랜잭션 콜백에는 자기 자신을 넘긴다. */
const createFakeMergePrisma = (issues: FakeIssueRow[], articles: FakeArticleRow[]) => {
  const updates: FakeUpdate[] = [];
  const transactionOptions: unknown[] = [];

  const client = {
    issue: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        issues.find((issue) => issue.id === where.id) ?? null,
      findMany: async ({ where }: { where: { id?: { not?: string }; status?: { in?: string[] } } }) =>
        issues.filter(
          (issue) =>
            issue.id !== where.id?.not && (where.status?.in ?? []).includes(issue.status),
        ),
      update: async (args: FakeUpdate) => {
        updates.push(args);

        const issue = issues.find((row) => row.id === args.where.id);

        if (issue) {
          Object.assign(issue, args.data);
        }

        return {};
      },
    },
    article: {
      findMany: async ({ where }: { where: { issueId: string } }) =>
        articles.filter(
          (article) => article.issueId === where.issueId && article.embedding.length > 0,
        ),
      updateMany: async ({
        where,
        data,
      }: {
        where: { issueId: string };
        data: { issueId: string };
      }) => {
        const targets = articles.filter((article) => article.issueId === where.issueId);

        targets.forEach((target) => {
          target.issueId = data.issueId;
        });

        return { count: targets.length };
      },
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>, options?: unknown) => {
      transactionOptions.push(options);

      return run(client);
    },
  };

  return { prisma: client as unknown as PrismaClient, updates, transactionOptions };
};

describe('PrismaAdminStore.recomputeCentroid', () => {
  it('연결 기사 임베딩 평균을 centroid 로 저장한다', async () => {
    const { prisma, updates } = createFakeMergePrisma(
      [createIssueRow()],
      [
        { id: 'a1', issueId: 'issue-1', embedding: [1, 0] },
        { id: 'a2', issueId: 'issue-1', embedding: [0, 1] },
      ],
    );

    await new PrismaAdminStore(prisma).recomputeCentroid('issue-1');

    expect(updates).toEqual([{ where: { id: 'issue-1' }, data: { centroid: [0.5, 0.5] } }]);
  });

  it('임베딩 있는 기사가 없으면 아무것도 쓰지 않는다', async () => {
    const { prisma, updates } = createFakeMergePrisma(
      [createIssueRow()],
      [{ id: 'a1', issueId: 'issue-1', embedding: [] }],
    );

    await new PrismaAdminStore(prisma).recomputeCentroid('issue-1');

    expect(updates).toEqual([]);
  });
});

describe('PrismaAdminStore.mergeIssue', () => {
  const createStore = () =>
    createFakeMergePrisma(
      [
        createIssueRow({ id: 'source', status: IssueStatus.DRAFT, question: '원본 질문', reviewNote: null }),
        createIssueRow({ id: 'target', status: IssueStatus.REVIEW, question: '대상 질문', reviewNote: null }),
      ],
      [
        { id: 'a1', issueId: 'source', embedding: [1, 0] },
        { id: 'a2', issueId: 'source', embedding: [0, 1] },
      ],
    );

  it('한 트랜잭션에서 기사 이동·반려·메모·centroid 재계산을 끝낸다', async () => {
    const { prisma, updates, transactionOptions } = createStore();

    const result = await new PrismaAdminStore(prisma).mergeIssue('source', 'target');

    expect(result).toEqual({ movedArticles: 2 });
    expect(transactionOptions).toEqual([PIPELINE_TRANSACTION_OPTIONS]);
    expect(updates).toEqual([
      {
        where: { id: 'source' },
        data: { status: IssueStatus.REJECTED, reviewNote: '[병합됨 → 대상 질문]' },
      },
      { where: { id: 'target' }, data: { reviewNote: '[병합 수신 ← 원본 질문, 기사 2건]' } },
      { where: { id: 'target' }, data: { centroid: [0.5, 0.5] } },
    ]);
  });

  it('없는 이슈면 찾을 수 없다고 알린다', async () => {
    const { prisma, updates } = createStore();

    await expect(new PrismaAdminStore(prisma).mergeIssue('source', 'missing')).rejects.toThrow(
      new AdminActionError(AdminMessage.ERROR_NOT_FOUND),
    );
    expect(updates).toEqual([]);
  });
});

describe('PrismaAdminStore.listMergeTargets', () => {
  it('자기 자신을 빼고 DRAFT·REVIEW·PUBLISHED 만 돌려준다', async () => {
    const { prisma } = createFakeMergePrisma(
      [
        createIssueRow({ id: 'self', status: IssueStatus.REVIEW }),
        createIssueRow({ id: 'target', status: IssueStatus.DRAFT, question: '대상 질문' }),
        createIssueRow({ id: 'rejected', status: IssueStatus.REJECTED }),
      ],
      [],
    );

    expect(await new PrismaAdminStore(prisma).listMergeTargets('self')).toEqual([
      { id: 'target', question: '대상 질문', status: IssueStatus.DRAFT },
    ]);
  });
});
