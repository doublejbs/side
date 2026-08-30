import { describe, expect, it } from 'vitest';

import { mediaPerspectivesSchema, opinionGroupsSchema } from '@/data/IssueJsonSchemas';
import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { extractClaims } from '@/pipeline/extractClaims';
import { EXTRACT_SCHEMA_NAME } from '@/pipeline/ExtractSchema';
import {
  createFakeArticleRow,
  createFakeIssueRow,
  createFakePrismaClient,
  type FakeDatabase,
  type FakeIssueRow,
} from '@/testing/FakePrismaClient';
import { createFakeTextClient } from '@/pipeline/FakeTextClient';

const CLASSIFIED_AT = new Date('2026-08-21T00:00:00.000Z');

/** classify 를 통과한 이슈. 추출 대상 조건(debateScore ≥ 임계값)을 만족한다. */
const createClassifiedIssueRow = (
  overrides: Partial<FakeIssueRow> & { id: string },
): FakeIssueRow =>
  createFakeIssueRow({ debateScore: 80, classifiedAt: CLASSIFIED_AT, ...overrides });

const claimOf = (side: ClaimSide, index: number, articleIndexes: number[]) => ({
  side,
  title: `${side} 주장 ${index}`,
  description: '기사에서 확인된 설명이다. 두 번째 문장이다.',
  evidences: articleIndexes.map((articleIndex) => ({
    articleIndex,
    type: EvidenceType.FACT,
    summary: `근거 ${articleIndex}`,
  })),
});

const groupOf = (share: number, agreesWith: number[]) => ({
  label: '모델이 지어낸 라벨',
  share,
  description: '이 그룹의 특징이다.',
  agreesWith,
  disagreesWith: [3],
  mostDivided: [1],
});

const EXTRACT_RESPONSE = {
  claims: [
    claimOf(ClaimSide.AGREE, 1, [0, 1]),
    claimOf(ClaimSide.AGREE, 2, [0, 2]),
    claimOf(ClaimSide.AGREE, 3, [1, 2]),
    claimOf(ClaimSide.DISAGREE, 1, [0, 99]),
    claimOf(ClaimSide.DISAGREE, 2, [1, 2]),
    claimOf(ClaimSide.DISAGREE, 3, [0, 1]),
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      frame: '노동자의 삶의 질',
      keywords: ['노동시간', '삶의 질', '휴식'],
      representativeArticleIndex: 0,
    },
    {
      leaning: MediaLeaning.CONSERVATIVE,
      frame: '기업 비용 부담',
      keywords: ['비용', '중소기업', '경쟁력'],
      representativeArticleIndex: 1,
    },
    {
      leaning: MediaLeaning.CENTRIST,
      frame: '성향이 지정되지 않은 관점',
      keywords: ['하나', '둘', '셋'],
      representativeArticleIndex: 2,
    },
  ],
  commonCoverage: ['법안 발의 사실', '정부의 시범 사업 검토'],
  opinionGroups: [groupOf(40, [0]), groupOf(35, [1]), groupOf(25, [2])],
};

const createTextClient = () => createFakeTextClient({ [EXTRACT_SCHEMA_NAME]: [EXTRACT_RESPONSE] });

const seed = (): Partial<FakeDatabase> => ({
  issues: [createClassifiedIssueRow({ id: 'issue-1', question: '주 4.5일제를 도입해야 할까?' })],
  articles: [
    createFakeArticleRow({
      id: 'a1',
      issueId: 'issue-1',
      publisher: '한겨레',
      originalLink: 'https://www.hani.co.kr/1',
      title: '노동시간 단축 논의',
      publishedAt: new Date('2026-08-25T00:00:00.000Z'),
    }),
    createFakeArticleRow({
      id: 'a2',
      issueId: 'issue-1',
      publisher: '조선일보',
      originalLink: 'https://www.chosun.com/2',
      title: '기업 비용 부담 우려',
      publishedAt: new Date('2026-08-24T00:00:00.000Z'),
    }),
    createFakeArticleRow({
      id: 'a3',
      issueId: 'issue-1',
      publisher: '연합뉴스',
      originalLink: 'https://www.yna.co.kr/3',
      title: '법안 처리 일정',
      publishedAt: new Date('2026-08-23T00:00:00.000Z'),
    }),
  ],
  publishers: [
    { id: 'p1', domain: 'hani.co.kr', name: '한겨레', leaning: 'PROGRESSIVE' },
    { id: 'p2', domain: 'chosun.com', name: '조선일보', leaning: 'CONSERVATIVE' },
    { id: 'p3', domain: 'yna.co.kr', name: '연합뉴스', leaning: null },
  ],
});

describe('extractClaims', () => {
  it('찬성 3 · 반대 3 주장을 진영별 순서로 저장한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    const result = await extractClaims({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ extracted: 1, skipped: 0, failed: [] });
    expect(db.claims).toHaveLength(6);
    expect(db.claims.filter((claim) => claim.side === 'AGREE').map((claim) => claim.order)).toEqual([0, 1, 2]);
    expect(db.claims.filter((claim) => claim.side === 'DISAGREE').map((claim) => claim.order)).toEqual([0, 1, 2]);
  });

  it('근거를 기사 행으로 치환한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await extractClaims({ prisma, textClient: createTextClient() });

    const firstClaim = db.claims[0];
    const evidences = db.evidences.filter((evidence) => evidence.claimId === firstClaim.id);

    expect(evidences).toHaveLength(2);
    expect(evidences[0]).toMatchObject({
      articleId: 'a1',
      source: '한겨레',
      url: 'https://www.hani.co.kr/1',
      date: new Date('2026-08-25T00:00:00.000Z'),
      type: 'FACT',
    });
  });

  it('범위 밖 기사 인덱스를 가리키는 근거는 폐기한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await extractClaims({ prisma, textClient: createTextClient() });

    const disagreeFirst = db.claims.find((claim) => claim.side === 'DISAGREE' && claim.order === 0);
    const evidences = db.evidences.filter((evidence) => evidence.claimId === disagreeFirst?.id);

    expect(evidences).toHaveLength(1);
    expect(evidences[0].articleId).toBe('a1');
  });

  it('폐기한 근거 수를 검수 메모에 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await extractClaims({ prisma, textClient: createTextClient() });

    expect(db.issues[0].reviewNote).toBe('[근거 폐기 1건]');
  });

  it('대표 기사 성향이 어긋나면 같은 성향의 첫 기사로 대체한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const textClient = createFakeTextClient({
      [EXTRACT_SCHEMA_NAME]: [
        {
          ...EXTRACT_RESPONSE,
          mediaPerspectives: [
            {
              leaning: MediaLeaning.PROGRESSIVE,
              frame: '노동자의 삶의 질',
              keywords: ['노동시간', '삶의 질', '휴식'],
              // 보수 매체 기사를 진보 관점의 대표로 잘못 골랐다.
              representativeArticleIndex: 1,
            },
          ],
        },
      ],
    });

    await extractClaims({ prisma, textClient });

    const perspectives = mediaPerspectivesSchema.parse(db.issues[0].mediaPerspectives);

    expect(perspectives[0].representativeArticle).toMatchObject({
      source: '한겨레',
      url: 'https://www.hani.co.kr/1',
    });
  });

  it('LLM 이 실패하면 기존 주장을 남기고 실패한 id 를 돌려준다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      claims: [
        { id: 'claim-old', issueId: 'issue-1', side: 'AGREE', order: 0, title: '기존', description: '기존' },
      ],
    });

    const result = await extractClaims({
      prisma,
      textClient: createFakeTextClient({}),
      issueId: 'issue-1',
    });

    expect(result).toEqual({ extracted: 0, skipped: 0, failed: ['issue-1'] });
    expect(db.claims.map((claim) => claim.id)).toEqual(['claim-old']);
  });

  it('성향이 지정된 매체만 언론 관점으로 남기고 기사 수를 실제 값으로 채운다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await extractClaims({ prisma, textClient: createTextClient() });

    const perspectives = mediaPerspectivesSchema.parse(db.issues[0].mediaPerspectives);

    expect(perspectives).toHaveLength(2);
    expect(perspectives.map((perspective) => perspective.leaning)).toEqual([
      MediaLeaning.PROGRESSIVE,
      MediaLeaning.CONSERVATIVE,
    ]);
    expect(perspectives[0]).toMatchObject({
      articleCount: 1,
      frame: '노동자의 삶의 질',
      representativeArticle: {
        title: '노동시간 단축 논의',
        source: '한겨레',
        url: 'https://www.hani.co.kr/1',
      },
    });
  });

  it('의견 그룹의 id·라벨을 강제하고 주장 인덱스를 주장 id 로 바꾼다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await extractClaims({ prisma, textClient: createTextClient() });

    const groups = opinionGroupsSchema.parse(db.issues[0].opinionGroups);
    const claimIds = db.claims.map((claim) => claim.id);

    expect(groups.map((group) => group.id)).toEqual([
      'issue-1-group-1',
      'issue-1-group-2',
      'issue-1-group-3',
    ]);
    expect(groups.map((group) => group.label)).toEqual(['그룹 A', '그룹 B', '그룹 C']);
    expect(groups[0].agreesWith).toEqual([claimIds[0]]);
    expect(groups[2].agreesWith).toEqual([claimIds[2]]);
    expect(groups[0].disagreesWith).toEqual([claimIds[3]]);
  });

  it('공통으로 다룬 내용을 저장한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await extractClaims({ prisma, textClient: createTextClient() });

    expect(db.issues[0].commonCoverage).toEqual(['법안 발의 사실', '정부의 시범 사업 검토']);
  });

  it('성향이 지정되지 않은 매체는 프롬프트의 성향 묶음에서 제외한다', async () => {
    const { prisma } = createFakePrismaClient(seed());
    const textClient = createTextClient();

    await extractClaims({ prisma, textClient });

    const { userPrompt } = textClient.requests[0];

    expect(userPrompt).toContain('진보 성향 매체 (PROGRESSIVE) 기사 1건');
    expect(userPrompt).toContain('보수 성향 매체 (CONSERVATIVE) 기사 1건');
    expect(userPrompt).not.toContain('중도 성향 매체');
    expect(userPrompt).toContain('[2] 연합뉴스');
  });

  it('이미 주장이 있는 이슈는 건너뛴다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      claims: [
        { id: 'claim-old', issueId: 'issue-1', side: 'AGREE', order: 0, title: '기존', description: '기존' },
      ],
    });
    const textClient = createTextClient();

    const result = await extractClaims({ prisma, textClient });

    expect(result).toEqual({ extracted: 0, skipped: 1, failed: [] });
    expect(textClient.requests).toHaveLength(0);
  });

  it('issueId 를 지정하면 기존 주장을 지우고 다시 만든다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      claims: [
        { id: 'claim-old', issueId: 'issue-1', side: 'AGREE', order: 0, title: '기존', description: '기존' },
      ],
      evidences: [
        {
          id: 'evidence-old',
          claimId: 'claim-old',
          type: 'FACT',
          source: '한겨레',
          date: new Date('2026-08-25T00:00:00.000Z'),
          summary: '기존 근거',
          url: 'https://www.hani.co.kr/1',
          articleId: 'a1',
        },
      ],
    });

    const result = await extractClaims({ prisma, textClient: createTextClient(), issueId: 'issue-1' });

    expect(result).toEqual({ extracted: 1, skipped: 0, failed: [] });
    expect(db.claims).toHaveLength(6);
    expect(db.claims.some((claim) => claim.id === 'claim-old')).toBe(false);
    expect(db.evidences.some((evidence) => evidence.id === 'evidence-old')).toBe(false);
  });

  it('질문이 아직 없는 이슈는 대상에서 빠진다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      issues: [createClassifiedIssueRow({ id: 'issue-1' })],
    });

    const result = await extractClaims({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ extracted: 0, skipped: 0, failed: [] });
  });

  it('기사가 없는 이슈는 건너뛴다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({ ...base, articles: [] });

    const result = await extractClaims({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ extracted: 0, skipped: 1, failed: [] });
  });

  it('논쟁성 점수가 임계값에 못 미치는 이슈는 대상에서 빠진다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createClassifiedIssueRow({ id: 'issue-1', question: '질문?', debateScore: 30 }),
      ],
    });
    const textClient = createTextClient();

    const result = await extractClaims({ prisma, textClient });

    expect(result).toEqual({ extracted: 0, skipped: 0, failed: [] });
    expect(textClient.requests).toHaveLength(0);
  });

  it('issueId 를 지정해도 자동 제외된 이슈는 되살리지 않는다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createClassifiedIssueRow({ id: 'issue-1', question: '질문?', status: 'AUTO_REJECTED' }),
      ],
    });

    const result = await extractClaims({ prisma, textClient: createTextClient(), issueId: 'issue-1' });

    expect(result).toEqual({ extracted: 0, skipped: 0, failed: [] });
    expect(db.claims).toHaveLength(0);
  });

  it('점수가 높은 이슈부터 노출 상한만큼만 추출한다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createClassifiedIssueRow({ id: 'issue-low', question: '낮은 점수 질문?', debateScore: 65 }),
        createClassifiedIssueRow({ id: 'issue-1', question: '높은 점수 질문?', debateScore: 95 }),
      ],
    });

    const result = await extractClaims({ prisma, textClient: createTextClient(), exposeLimit: 1 });

    expect(result.extracted).toBe(1);
    expect(db.claims.every((claim) => claim.issueId === 'issue-1')).toBe(true);
  });

  it('분류가 뽑아 둔 사전 추출 요지를 프롬프트에 넣는다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          question: '주 4.5일제를 도입해야 할까?',
          classification: {
            isPolicyDebate: true,
            debateScore: 80,
            topic: '노동',
            reason: '노동시간 제도 변경에 찬반이 갈린다.',
            entities: ['국회'],
            keySentences: ['적용 범위가 쟁점이다.', '중소기업 부담이 쟁점이다.', '임금 보전이 쟁점이다.'],
            keyClaims: ['삶의 질이 좋아진다', '비용이 늘어난다', '생산성이 관건이다'],
          },
        }),
      ],
    });
    const textClient = createTextClient();

    await extractClaims({ prisma, textClient });

    const { userPrompt } = textClient.requests[0];

    expect(userPrompt).toContain('사전 추출 요지');
    expect(userPrompt).toContain('- 주장: 비용이 늘어난다');
  });
});

/** classify 결과. `duplicateOfIssueId` 를 넣으면 중복으로 표시된 이슈가 된다. */
const classificationOf = (duplicateOfIssueId?: string) => ({
  isPolicyDebate: true,
  debateScore: 80,
  topic: '노동',
  reason: '정년 제도 변경에 찬반이 갈린다.',
  entities: [],
  keySentences: [],
  keyClaims: [],
  ...(duplicateOfIssueId === undefined ? {} : { duplicateOfIssueId }),
});

describe('extractClaims 중복 보류', () => {
  it('중복 쌍은 하나만 추출한다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          question: '정년을 65세로 연장해야 할까?',
          classification: classificationOf(),
        }),
        createClassifiedIssueRow({
          id: 'issue-dup',
          question: '정년 연장을 도입해야 할까?',
          classification: classificationOf('issue-1'),
        }),
      ],
      articles: [
        ...(base.articles ?? []),
        createFakeArticleRow({ id: 'a4', issueId: 'issue-dup' }),
      ],
    });

    const result = await extractClaims({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ extracted: 1, skipped: 1, failed: [] });
    expect(db.claims.every((claim) => claim.issueId === 'issue-1')).toBe(true);
  });

  it('issueId 를 지정하면 중복이어도 추출한다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          question: '정년을 65세로 연장해야 할까?',
          classification: classificationOf(),
        }),
        createClassifiedIssueRow({
          id: 'issue-dup',
          question: '정년 연장을 도입해야 할까?',
          classification: classificationOf('issue-1'),
        }),
      ],
      articles: [
        ...(base.articles ?? []),
        createFakeArticleRow({ id: 'a4', issueId: 'issue-dup' }),
      ],
    });

    const result = await extractClaims({
      prisma,
      textClient: createTextClient(),
      issueId: 'issue-dup',
    });

    expect(result.extracted).toBe(1);
    expect(db.claims.every((claim) => claim.issueId === 'issue-dup')).toBe(true);
  });
});
