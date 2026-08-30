import { describe, expect, it } from 'vitest';

import {
  createFakeArticleRow,
  createFakeIssueRow,
  createFakePrismaClient,
  type FakeClaimRow,
  type FakeDatabase,
  type FakeEvidenceRow,
  type FakeIssueRow,
} from '@/testing/FakePrismaClient';
import { appendWarnings, collectIssueWarnings, linkSources } from '@/pipeline/linkSources';

const claimRow = (id: string, side: string, order: number): FakeClaimRow => ({
  id,
  issueId: 'issue-1',
  side,
  order,
  title: `${side} 주장 ${order + 1}`,
  description: '설명',
});

const evidenceRow = (id: string, claimId: string, articleId: string | null): FakeEvidenceRow => ({
  id,
  claimId,
  type: 'FACT',
  source: '연합뉴스',
  date: new Date('2026-08-20T00:00:00.000Z'),
  summary: `근거 ${id}`,
  url: 'https://news.example/1',
  articleId,
});

const SIX_CLAIMS: FakeClaimRow[] = [
  claimRow('c1', 'AGREE', 0),
  claimRow('c2', 'AGREE', 1),
  claimRow('c3', 'AGREE', 2),
  claimRow('c4', 'DISAGREE', 0),
  claimRow('c5', 'DISAGREE', 1),
  claimRow('c6', 'DISAGREE', 2),
];

const twoEvidencesEach = (): FakeEvidenceRow[] =>
  SIX_CLAIMS.flatMap((claim, index) => [
    evidenceRow(`e${index}-1`, claim.id, 'a1'),
    evidenceRow(`e${index}-2`, claim.id, 'a2'),
  ]);

const VERIFIED_AT = new Date('2026-08-26T00:00:00.000Z');

/** 근거 검증까지 끝난 이슈. link 대상 조건(`verifiedAt != null`)을 만족한다. */
const createVerifiedIssueRow = (
  overrides: Partial<FakeIssueRow> & { id: string },
): FakeIssueRow => createFakeIssueRow({ verifiedAt: VERIFIED_AT, ...overrides });

const seed = (overrides: Partial<FakeDatabase> = {}): Partial<FakeDatabase> => ({
  issues: [createVerifiedIssueRow({ id: 'issue-1', question: '주 4.5일제를 도입해야 할까?' })],
  articles: [
    createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
    createFakeArticleRow({ id: 'a2', issueId: 'issue-1' }),
  ],
  claims: SIX_CLAIMS,
  evidences: twoEvidencesEach(),
  ...overrides,
});

describe('collectIssueWarnings', () => {
  const articles = [{ id: 'a1' }, { id: 'a2' }];

  it('이상이 없으면 경고가 없다', () => {
    const claims = SIX_CLAIMS.map((claim) => ({
      side: claim.side,
      title: claim.title,
      evidences: [
        { articleId: 'a1', summary: '근거 1' },
        { articleId: 'a2', summary: '근거 2' },
      ],
    }));

    expect(collectIssueWarnings({ claims, articles })).toEqual([]);
  });

  it('근거가 1개 이하인 주장을 경고한다', () => {
    const claims = [
      { side: 'AGREE', title: '근거 부족 주장', evidences: [{ articleId: 'a1', summary: '근거 1' }] },
    ];

    expect(collectIssueWarnings({ claims, articles })).toContain('근거가 1개뿐인 주장: "근거 부족 주장"');
  });

  it('이슈에 속하지 않는 기사를 가리키는 근거를 경고한다', () => {
    const claims = [
      {
        side: 'AGREE',
        title: '주장',
        evidences: [
          { articleId: 'a1', summary: '정상 근거' },
          { articleId: 'other', summary: '남의 기사' },
        ],
      },
    ];

    expect(collectIssueWarnings({ claims, articles })).toContain(
      '이슈에 속하지 않는 기사를 가리키는 근거: "주장" — 남의 기사',
    );
  });

  it('진영별 주장이 3개 미만이면 경고한다', () => {
    const claims = [
      { side: 'AGREE', title: '찬성 1', evidences: [{ articleId: 'a1', summary: '1' }, { articleId: 'a2', summary: '2' }] },
    ];
    const warnings = collectIssueWarnings({ claims, articles });

    expect(warnings).toContain('찬성 주장이 3개 미만입니다 (1개)');
    expect(warnings).toContain('반대 주장이 3개 미만입니다 (0개)');
  });
});

describe('appendWarnings', () => {
  it('경고가 없으면 기존 메모를 그대로 둔다', () => {
    expect(appendWarnings('기존 메모', [])).toBe('기존 메모');
    expect(appendWarnings(null, [])).toBeNull();
  });

  it('기존 메모 아래에 경고를 한 줄씩 붙인다', () => {
    expect(appendWarnings('기존 메모', ['경고 1', '경고 2'])).toBe('기존 메모\n경고 1\n경고 2');
  });

  it('기존 메모가 없으면 경고만 남긴다', () => {
    expect(appendWarnings(null, ['경고 1'])).toBe('경고 1');
  });
});

describe('linkSources', () => {
  it('주장 6개를 갖춘 DRAFT 이슈를 REVIEW 로 넘긴다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    const result = await linkSources({ prisma });

    expect(result).toEqual({ reviewed: 1, warnings: 0 });
    expect(db.issues[0].status).toBe('REVIEW');
    expect(db.issues[0].reviewNote).toBeNull();
  });

  it('경고가 있어도 REVIEW 로 넘기고 메모에 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient(
      seed({
        evidences: [
          evidenceRow('e1', 'c1', 'a1'),
          ...SIX_CLAIMS.slice(1).flatMap((claim, index) => [
            evidenceRow(`x${index}-1`, claim.id, 'a1'),
            evidenceRow(`x${index}-2`, claim.id, 'zzz'),
          ]),
        ],
      }),
    );

    const result = await linkSources({ prisma });

    expect(result.reviewed).toBe(1);
    expect(result.warnings).toBe(6);
    expect(db.issues[0].status).toBe('REVIEW');
    expect(db.issues[0].reviewNote).toContain('근거가 1개뿐인 주장');
    expect(db.issues[0].reviewNote).toContain('이슈에 속하지 않는 기사를 가리키는 근거');
  });

  it('기존 검수 메모를 유지한다', async () => {
    const { db, prisma } = createFakePrismaClient(
      seed({
        issues: [createVerifiedIssueRow({ id: 'issue-1', question: '질문?', reviewNote: '이전 메모' })],
        evidences: [evidenceRow('e1', 'c1', 'a1')],
      }),
    );

    await linkSources({ prisma });

    expect(db.issues[0].reviewNote?.startsWith('이전 메모\n')).toBe(true);
  });

  it('주장이 6개가 아니어도 경고를 남기고 REVIEW 로 넘긴다', async () => {
    const { db, prisma } = createFakePrismaClient(seed({ claims: SIX_CLAIMS.slice(0, 5) }));

    const result = await linkSources({ prisma });

    expect(result.reviewed).toBe(1);
    expect(db.issues[0].status).toBe('REVIEW');
    expect(db.issues[0].reviewNote).toContain('주장이 6개가 아닙니다 (5개)');
  });

  it('주장이 하나도 없으면 아직 추출 전이므로 넘기지 않는다', async () => {
    const { db, prisma } = createFakePrismaClient(seed({ claims: [], evidences: [] }));

    const result = await linkSources({ prisma });

    expect(result).toEqual({ reviewed: 0, warnings: 0 });
    expect(db.issues[0].status).toBe('DRAFT');
  });

  it('DRAFT 가 아닌 이슈는 대상이 아니다', async () => {
    const { db, prisma } = createFakePrismaClient(
      seed({ issues: [createVerifiedIssueRow({ id: 'issue-1', status: 'REVIEW', question: '질문?' })] }),
    );

    const result = await linkSources({ prisma });

    expect(result).toEqual({ reviewed: 0, warnings: 0 });
    expect(db.issues[0].reviewNote).toBeNull();
  });

  it('근거 검증 전 이슈는 검수로 넘기지 않는다', async () => {
    const { db, prisma } = createFakePrismaClient(
      seed({ issues: [createFakeIssueRow({ id: 'issue-1', question: '질문?' })] }),
    );

    const result = await linkSources({ prisma });

    expect(result).toEqual({ reviewed: 0, warnings: 0 });
    expect(db.issues[0].status).toBe('DRAFT');
  });

  it('issueId 를 지정하면 그 이슈만 검사한다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createVerifiedIssueRow({ id: 'issue-1', question: '질문?' }),
        createVerifiedIssueRow({ id: 'issue-2', question: '다른 질문?' }),
      ],
    });

    const result = await linkSources({ prisma, issueId: 'issue-1' });

    expect(result.reviewed).toBe(1);
    expect(db.issues[1].status).toBe('DRAFT');
  });
});
