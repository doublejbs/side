import type { PrismaClient } from '@prisma/client';

/**
 * 테스트 전용 인메모리 Prisma 대역. 프로덕션 코드는 이 모듈을 import 하지 않는다
 * (`src/testing/**` 는 `*.test.ts` 에서만 참조 — 번들에 포함되지 않는다).
 *
 * 파이프라인·관리자 코드가 실제로 쓰는 질의(기사 수집·임베딩·배정, 이슈 조회·수정,
 * 주장 생성·삭제, 검색 키워드·매체 조회, 실행 기록)만 흉내 낸다.
 *
 * 반환값은 Prisma 가 만들어 내는 전체 타입을 재현하지 않으므로 마지막에
 * `as unknown as PrismaClient` 로 단언한다. 테스트 지원 모듈에 한해 허용하는 예외다.
 */

export interface FakeArticleRow {
  id: string;
  naverLink: string;
  originalLink: string;
  title: string;
  description: string;
  publisher: string | null;
  publishedAt: Date;
  collectedAt: Date;
  embedding: number[];
  issueId: string | null;
}

export interface FakeEvidenceRow {
  id: string;
  claimId: string;
  type: string;
  source: string;
  date: Date;
  summary: string;
  url: string;
  articleId: string | null;
}

export interface FakeClaimRow {
  id: string;
  issueId: string;
  side: string;
  order: number;
  title: string;
  description: string;
}

export interface FakeIssueRow {
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
  centroid: number[];
  reviewNote: string | null;
  summarizedAt: Date | null;
  summarizedArticleCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakePublisherRow {
  id: string;
  domain: string;
  name: string;
  leaning: string | null;
}

export interface FakeSearchQueryRow {
  id: string;
  keyword: string;
  isActive: boolean;
  createdAt: Date;
}

export interface FakePipelineRunRow {
  id: string;
  step: string;
  status: string;
  detail: unknown;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface FakeDatabase {
  issues: FakeIssueRow[];
  articles: FakeArticleRow[];
  claims: FakeClaimRow[];
  evidences: FakeEvidenceRow[];
  publishers: FakePublisherRow[];
  searchQueries: FakeSearchQueryRow[];
  pipelineRuns: FakePipelineRunRow[];
}

/** 어떤 모델의 어떤 메서드가 몇 번 불렸는지 세는 호출 기록. */
export interface FakeCall {
  model: string;
  method: string;
  args: unknown;
}

interface IssueWhere {
  id?: string;
  status?: string | { in?: string[] };
  question?: { not?: string };
  createdAt?: { gte?: Date };
  articles?: { some?: { publishedAt?: { gte?: Date } } };
}

interface ArticleWhere {
  id?: string | { in?: string[] };
  issueId?: string | null;
  naverLink?: { in?: string[] };
  embedding?: { isEmpty?: boolean };
}

type OrderBy = Record<string, 'asc' | 'desc'> | undefined;

interface EvidenceCreateInput {
  type: string;
  source: string;
  date: Date;
  summary: string;
  url: string;
  articleId?: string | null;
  article?: { connect: { id: string } };
}

interface ClaimCreateInput {
  issueId?: string;
  issue?: { connect: { id: string } };
  side: string;
  order: number;
  title: string;
  description: string;
  evidences?: { create: EvidenceCreateInput[] };
}

export interface FakePrismaResult {
  db: FakeDatabase;
  calls: FakeCall[];
  prisma: PrismaClient;
}

/** 테스트에서 이슈 행을 만들 때 쓰는 기본값. */
export const createFakeIssueRow = (overrides: Partial<FakeIssueRow> & { id: string }): FakeIssueRow => ({
  status: 'DRAFT',
  slug: null,
  question: '(미정)',
  tags: [],
  summary: [],
  keyPoints: [],
  commonCoverage: [],
  mediaPerspectives: [],
  opinionGroups: [],
  centroid: [],
  reviewNote: null,
  summarizedAt: null,
  summarizedArticleCount: 0,
  publishedAt: null,
  createdAt: new Date('2026-08-20T00:00:00.000Z'),
  updatedAt: new Date('2026-08-20T00:00:00.000Z'),
  ...overrides,
});

/** 테스트에서 기사 행을 만들 때 쓰는 기본값. */
export const createFakeArticleRow = (
  overrides: Partial<FakeArticleRow> & { id: string },
): FakeArticleRow => ({
  naverLink: `https://n.news.naver.com/${overrides.id}`,
  originalLink: `https://news.example/${overrides.id}`,
  title: `기사 ${overrides.id}`,
  description: `설명 ${overrides.id}`,
  publisher: '연합뉴스',
  publishedAt: new Date('2026-08-20T00:00:00.000Z'),
  collectedAt: new Date('2026-08-20T00:00:00.000Z'),
  embedding: [],
  issueId: null,
  ...overrides,
});

const emptyDatabase = (): FakeDatabase => ({
  issues: [],
  articles: [],
  claims: [],
  evidences: [],
  publishers: [],
  searchQueries: [],
  pipelineRuns: [],
});

const matchesIssue = (
  issue: FakeIssueRow,
  where: IssueWhere | undefined,
  articlesOf: (issueId: string) => FakeArticleRow[],
): boolean => {
  if (!where) {
    return true;
  }

  if (where.id !== undefined && issue.id !== where.id) {
    return false;
  }

  if (typeof where.status === 'string' && issue.status !== where.status) {
    return false;
  }

  if (typeof where.status === 'object' && where.status.in && !where.status.in.includes(issue.status)) {
    return false;
  }

  if (where.question?.not !== undefined && issue.question === where.question.not) {
    return false;
  }

  if (where.createdAt?.gte !== undefined && issue.createdAt < where.createdAt.gte) {
    return false;
  }

  const publishedAtGte = where.articles?.some?.publishedAt?.gte;

  if (
    publishedAtGte !== undefined &&
    !articlesOf(issue.id).some((article) => article.publishedAt >= publishedAtGte)
  ) {
    return false;
  }

  return true;
};

const matchesArticle = (article: FakeArticleRow, where: ArticleWhere | undefined): boolean => {
  if (!where) {
    return true;
  }

  if (typeof where.id === 'string' && article.id !== where.id) {
    return false;
  }

  if (typeof where.id === 'object' && where.id.in && !where.id.in.includes(article.id)) {
    return false;
  }

  if (where.issueId !== undefined && article.issueId !== where.issueId) {
    return false;
  }

  if (where.naverLink?.in && !where.naverLink.in.includes(article.naverLink)) {
    return false;
  }

  if (where.embedding?.isEmpty === true && article.embedding.length > 0) {
    return false;
  }

  if (where.embedding?.isEmpty === false && article.embedding.length === 0) {
    return false;
  }

  return true;
};

const compareBy = <T extends object>(rows: T[], orderBy: OrderBy): T[] => {
  if (!orderBy) {
    return rows;
  }

  const [field, direction] = Object.entries(orderBy)[0] ?? [];

  if (!field) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const a = (left as Record<string, unknown>)[field];
    const b = (right as Record<string, unknown>)[field];
    const delta = a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : Number(a) - Number(b);

    return direction === 'desc' ? -delta : delta;
  });
};

export const createFakePrismaClient = (seed: Partial<FakeDatabase> = {}): FakePrismaResult => {
  const db: FakeDatabase = { ...emptyDatabase(), ...seed };
  const calls: FakeCall[] = [];

  let sequence = 0;

  const record = (model: string, method: string, args: unknown): void => {
    calls.push({ model, method, args });
  };

  const nextId = (prefix: string): string => {
    sequence += 1;

    return `${prefix}-${sequence}`;
  };

  const articlesOf = (issueId: string): FakeArticleRow[] =>
    db.articles.filter((article) => article.issueId === issueId);

  const evidencesOf = (claimId: string) => db.evidences.filter((evidence) => evidence.claimId === claimId);

  const withRelations = (issue: FakeIssueRow) => ({
    ...issue,
    articles: articlesOf(issue.id),
    claims: db.claims
      .filter((claim) => claim.issueId === issue.id)
      .map((claim) => ({ ...claim, evidences: evidencesOf(claim.id) })),
    _count: { articles: articlesOf(issue.id).length },
  });

  const client = {
    searchQuery: {
      findMany: async ({ where, orderBy }: { where?: { isActive?: boolean }; orderBy?: OrderBy } = {}) => {
        record('searchQuery', 'findMany', { where, orderBy });

        const rows = db.searchQueries.filter(
          (query) => where?.isActive === undefined || query.isActive === where.isActive,
        );

        return compareBy(rows, orderBy).map((row) => ({ ...row }));
      },
    },
    article: {
      findMany: async ({
        where,
        orderBy,
        take,
      }: { where?: ArticleWhere; orderBy?: OrderBy; take?: number } = {}) => {
        record('article', 'findMany', { where, orderBy, take });

        const rows = compareBy(
          db.articles.filter((article) => matchesArticle(article, where)),
          orderBy,
        ).map((row) => ({ ...row }));

        return take === undefined ? rows : rows.slice(0, take);
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeArticleRow> }) => {
        record('article', 'update', { where, data });

        const article = db.articles.find((row) => row.id === where.id);

        if (!article) {
          throw new Error(`기사를 찾을 수 없다: ${where.id}`);
        }

        Object.assign(article, data);

        return { ...article };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: ArticleWhere;
        data: Partial<FakeArticleRow>;
      }) => {
        record('article', 'updateMany', { where, data });

        const targets = db.articles.filter((article) => matchesArticle(article, where));

        targets.forEach((target) => Object.assign(target, data));

        return { count: targets.length };
      },
      createMany: async ({ data }: { data: Partial<FakeArticleRow>[]; skipDuplicates?: boolean }) => {
        record('article', 'createMany', { data });

        const existing = new Set(db.articles.map((article) => article.naverLink));
        const rows = data.filter((row) => !existing.has(row.naverLink ?? ''));

        rows.forEach((row) => {
          db.articles.push(createFakeArticleRow({ ...row, id: nextId('article') }));
        });

        return { count: rows.length };
      },
    },
    issue: {
      findMany: async ({ where, orderBy }: { where?: IssueWhere; orderBy?: OrderBy } = {}) => {
        record('issue', 'findMany', { where, orderBy });

        return compareBy(
          db.issues.filter((issue) => matchesIssue(issue, where, articlesOf)),
          orderBy,
        ).map(withRelations);
      },
      findUnique: async ({ where }: { where: IssueWhere }) => {
        record('issue', 'findUnique', { where });

        const found = db.issues.find((issue) => matchesIssue(issue, where, articlesOf));

        return found ? withRelations(found) : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        record('issue', 'create', { data });

        const issue = createFakeIssueRow({
          ...(data as Partial<FakeIssueRow>),
          id: nextId('issue'),
        });

        db.issues.push(issue);

        return { ...issue };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        record('issue', 'update', { where, data });

        const issue = db.issues.find((row) => row.id === where.id);

        if (!issue) {
          throw new Error(`이슈를 찾을 수 없다: ${where.id}`);
        }

        Object.assign(issue, data, { updatedAt: new Date() });

        return { ...issue };
      },
    },
    claim: {
      deleteMany: async ({ where }: { where: { issueId: string } }) => {
        record('claim', 'deleteMany', { where });

        const removed = db.claims.filter((claim) => claim.issueId === where.issueId);

        db.claims = db.claims.filter((claim) => claim.issueId !== where.issueId);
        db.evidences = db.evidences.filter(
          (evidence) => !removed.some((claim) => claim.id === evidence.claimId),
        );

        return { count: removed.length };
      },
      create: async ({ data }: { data: ClaimCreateInput }) => {
        record('claim', 'create', { data });

        const claim: FakeClaimRow = {
          id: nextId('claim'),
          issueId: data.issueId ?? data.issue?.connect.id ?? '',
          side: data.side,
          order: data.order,
          title: data.title,
          description: data.description,
        };

        db.claims.push(claim);
        (data.evidences?.create ?? []).forEach((evidence) => {
          db.evidences.push({
            id: nextId('evidence'),
            claimId: claim.id,
            type: evidence.type,
            source: evidence.source,
            date: evidence.date,
            summary: evidence.summary,
            url: evidence.url,
            articleId: evidence.articleId ?? evidence.article?.connect.id ?? null,
          });
        });

        return { ...claim };
      },
    },
    publisher: {
      findMany: async () => {
        record('publisher', 'findMany', {});

        return db.publishers.map((publisher) => ({ ...publisher }));
      },
    },
    pipelineRun: {
      create: async ({ data }: { data: { step: string; status: string; detail?: unknown } }) => {
        record('pipelineRun', 'create', { data });

        const run: FakePipelineRunRow = {
          id: nextId('run'),
          step: data.step,
          status: data.status,
          detail: data.detail ?? null,
          startedAt: new Date(),
          finishedAt: null,
        };

        db.pipelineRuns.push(run);

        return { ...run };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        record('pipelineRun', 'update', { where, data });

        const run = db.pipelineRuns.find((row) => row.id === where.id);

        if (!run) {
          throw new Error(`실행 기록을 찾을 수 없다: ${where.id}`);
        }

        Object.assign(run, data);

        return { ...run };
      },
    },
    $transaction: async (arg: unknown) => {
      record('$transaction', 'call', {});

      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => Promise<unknown>)(client);
      }

      return Promise.all(arg as Promise<unknown>[]);
    },
    $disconnect: async () => undefined,
  };

  return { db, calls, prisma: client as unknown as PrismaClient };
};

/** 특정 모델·메서드 호출 횟수. 배치 갱신 같은 호출 횟수 단언에 쓴다. */
export const countCalls = (calls: FakeCall[], model: string, method: string): number =>
  calls.filter((call) => call.model === model && call.method === method).length;
