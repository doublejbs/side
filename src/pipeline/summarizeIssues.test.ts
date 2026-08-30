import { IssueStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { classifyIssues } from '@/pipeline/classifyIssues';
import { CLASSIFY_SCHEMA_NAME } from '@/pipeline/ClassifySchema';
import { clusterArticles } from '@/pipeline/clusterArticles';
import type { EmbeddingClient } from '@/pipeline/EmbeddingClient';
import { createFakeTextClient } from '@/pipeline/FakeTextClient';
import { SUMMARIZE_SCHEMA_NAME } from '@/pipeline/SummarizeSchema';
import {
  RESUMMARIZED_NOTE,
  shouldSummarize,
  summarizeIssues,
} from '@/pipeline/summarizeIssues';
import { UNDECIDED_QUESTION } from '@/pipeline/UndecidedQuestion';
import {
  createFakeArticleRow,
  createFakeIssueRow,
  createFakePrismaClient,
  type FakeIssueRow,
} from '@/testing/FakePrismaClient';

const SUMMARY_RESPONSE = {
  question: '주 4.5일제를 도입해야 할까?',
  tags: ['노동', '경제'],
  summary: ['법안이 발의됐다.', '정부가 검토 중이다.', '노사 입장이 갈린다.'],
  keyPoints: [
    { title: '생산성', question: '생산성은 유지될까?' },
    { title: '임금', question: '임금은 그대로일까?' },
    { title: '업종', question: '모든 업종에 적용될까?' },
    { title: '해외', question: '해외 사례는 어떨까?' },
  ],
};

const createTextClient = () => createFakeTextClient({ [SUMMARIZE_SCHEMA_NAME]: [SUMMARY_RESPONSE] });

/** 모델이 기사 인덱스 인용 표기를 그대로 남긴 응답. */
const CITED_SUMMARY_RESPONSE = {
  question: '주 4.5일제[0]를 도입해야 할까?',
  tags: ['노동', '경제'],
  summary: ['법안이 발의됐다 [0].', '정부가 [1] 검토 중이다.', '노사 입장이 갈린다 [2, 3].'],
  keyPoints: [
    { title: '생산성 [0]', question: '생산성은 유지될까? [1]' },
    { title: '임금', question: '임금은 그대로일까?' },
    { title: '업종', question: '모든 업종에 적용될까?' },
    { title: '해외', question: '해외 사례는 어떨까?' },
  ],
};

const createCitedTextClient = () =>
  createFakeTextClient({ [SUMMARIZE_SCHEMA_NAME]: [CITED_SUMMARY_RESPONSE] });

/** 응답 큐가 비어 있어 항상 실패하는 텍스트 클라이언트. */
const createFailingTextClient = () => createFakeTextClient({});

const SUMMARIZED_AT = new Date('2026-08-20T00:00:00.000Z');

const CLASSIFIED_AT = new Date('2026-08-21T00:00:00.000Z');

/** classify 를 통과한 이슈. 요약 대상 조건(debateScore ≥ 임계값)을 만족한다. */
const createClassifiedIssueRow = (
  overrides: Partial<FakeIssueRow> & { id: string },
): FakeIssueRow =>
  createFakeIssueRow({ debateScore: 80, classifiedAt: CLASSIFIED_AT, ...overrides });

describe('shouldSummarize', () => {
  it('기사가 없으면 요약하지 않는다', () => {
    expect(
      shouldSummarize(
        { question: UNDECIDED_QUESTION, summarizedAt: null, summarizedArticleCount: 0 },
        0,
      ),
    ).toBe(false);
  });

  it('질문이 아직 없으면 요약한다', () => {
    expect(
      shouldSummarize(
        { question: UNDECIDED_QUESTION, summarizedAt: SUMMARIZED_AT, summarizedArticleCount: 10 },
        10,
      ),
    ).toBe(true);
  });

  it('한 번도 요약된 적이 없으면 요약한다', () => {
    expect(
      shouldSummarize({ question: '질문?', summarizedAt: null, summarizedArticleCount: 0 }, 3),
    ).toBe(true);
  });

  it('마지막 요약 이후 기사가 30% 미만으로 늘었으면 요약하지 않는다', () => {
    expect(
      shouldSummarize(
        { question: '질문?', summarizedAt: SUMMARIZED_AT, summarizedArticleCount: 10 },
        12,
      ),
    ).toBe(false);
  });

  it('마지막 요약 이후 기사가 30% 이상 늘었으면 다시 요약한다', () => {
    expect(
      shouldSummarize(
        { question: '질문?', summarizedAt: SUMMARIZED_AT, summarizedArticleCount: 10 },
        13,
      ),
    ).toBe(true);
  });
});

describe('summarizeIssues', () => {
  it('질문이 없는 DRAFT 이슈를 요약해 저장한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1' })],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-1' }),
      ],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ summarized: 1, skipped: 0, failed: [] });
    expect(db.issues[0].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[0].tags).toEqual(['노동', '경제']);
    expect(db.issues[0].summary).toHaveLength(3);
    expect(db.issues[0].keyPoints).toEqual([
      { id: 'issue-1-kp-1', title: '생산성', question: '생산성은 유지될까?' },
      { id: 'issue-1-kp-2', title: '임금', question: '임금은 그대로일까?' },
      { id: 'issue-1-kp-3', title: '업종', question: '모든 업종에 적용될까?' },
      { id: 'issue-1-kp-4', title: '해외', question: '해외 사례는 어떨까?' },
    ]);
  });

  it('모델이 남긴 인용 번호를 지우고 저장한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1' })],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-1' }),
      ],
    });

    await summarizeIssues({ prisma, textClient: createCitedTextClient() });

    expect(db.issues[0].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[0].summary).toEqual([
      '법안이 발의됐다.',
      '정부가 검토 중이다.',
      '노사 입장이 갈린다.',
    ]);
    expect(db.issues[0].keyPoints).toEqual([
      { id: 'issue-1-kp-1', title: '생산성', question: '생산성은 유지될까?' },
      { id: 'issue-1-kp-2', title: '임금', question: '임금은 그대로일까?' },
      { id: 'issue-1-kp-3', title: '업종', question: '모든 업종에 적용될까?' },
      { id: 'issue-1-kp-4', title: '해외', question: '해외 사례는 어떨까?' },
    ]);
  });

  it('요약에 성공하면 요약 시각과 기사 수를 기록한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1' })],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-1' }),
      ],
    });

    await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(db.issues[0].summarizedAt).toBeInstanceOf(Date);
    expect(db.issues[0].summarizedArticleCount).toBe(2);
  });

  it('기사가 없는 이슈는 건너뛴다', async () => {
    const { prisma } = createFakePrismaClient({ issues: [createClassifiedIssueRow({ id: 'issue-1' })] });
    const textClient = createTextClient();

    const result = await summarizeIssues({ prisma, textClient });

    expect(result).toEqual({ summarized: 0, skipped: 1, failed: [] });
    expect(textClient.requests).toHaveLength(0);
  });

  it('이미 요약됐고 기사가 조금만 늘었으면 건너뛴다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          question: '이미 있는 질문?',
          summarizedAt: SUMMARIZED_AT,
          summarizedArticleCount: 2,
        }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-1' }),
      ],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ summarized: 0, skipped: 1, failed: [] });
  });

  it('검수 중 이슈도 기사가 크게 늘면 다시 요약하고 상태는 그대로 둔다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          status: IssueStatus.REVIEW,
          question: '이미 있는 질문?',
          summarizedAt: SUMMARIZED_AT,
          summarizedArticleCount: 2,
          reviewNote: '기존 메모',
        }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a3', issueId: 'issue-1' }),
      ],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(result.summarized).toBe(1);
    expect(db.issues[0].status).toBe(IssueStatus.REVIEW);
    expect(db.issues[0].reviewNote).toBe(`기존 메모\n${RESUMMARIZED_NOTE}`);
  });

  it('승인된 이슈는 대상이 아니다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1', status: IssueStatus.PUBLISHED })],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ summarized: 0, skipped: 0, failed: [] });
  });

  it('issueId 를 지정하면 30% 조건은 무시하고 그 이슈만 다시 요약한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          question: '이미 있는 질문?',
          summarizedAt: SUMMARIZED_AT,
          summarizedArticleCount: 1,
        }),
        createClassifiedIssueRow({ id: 'issue-2' }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-2' }),
      ],
    });

    const result = await summarizeIssues({
      prisma,
      textClient: createTextClient(),
      issueId: 'issue-1',
    });

    expect(result).toEqual({ summarized: 1, skipped: 0, failed: [] });
    expect(db.issues[0].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[1].question).toBe(UNDECIDED_QUESTION);
  });

  it('issueId 를 지정해도 상태 제한은 유지해 승인된 이슈는 건드리지 않는다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          status: IssueStatus.PUBLISHED,
          question: '이미 있는 질문?',
        }),
      ],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });
    const textClient = createTextClient();

    const result = await summarizeIssues({ prisma, textClient, issueId: 'issue-1' });

    expect(result).toEqual({ summarized: 0, skipped: 0, failed: [] });
    expect(textClient.requests).toHaveLength(0);
    expect(db.issues[0].question).toBe('이미 있는 질문?');
  });

  it('한 이슈가 실패해도 나머지는 계속 요약하고 실패한 id 를 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1' }), createClassifiedIssueRow({ id: 'issue-2' })],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-2' }),
      ],
    });
    // 첫 이슈에서만 응답이 나오고 두 번째부터는 큐가 비어 실패하도록 만든다.
    const textClient = createFakeTextClient({ [SUMMARIZE_SCHEMA_NAME]: [SUMMARY_RESPONSE] });

    // 큐를 소진한 뒤에는 마지막 응답을 재사용하므로, 실패는 별도 클라이언트로 확인한다.
    await summarizeIssues({ prisma, textClient });

    const failing = await summarizeIssues({
      prisma,
      textClient: createFailingTextClient(),
      issueId: 'issue-1',
    });

    expect(failing.summarized).toBe(0);
    expect(failing.skipped).toBe(0);
    expect(failing.failed).toHaveLength(1);
    expect(failing.failed[0].issueId).toBe('issue-1');
    expect(failing.failed[0].message).toContain('Error');
    expect(db.issues[0].question).toBe('주 4.5일제를 도입해야 할까?');
  });

  it('논쟁성 점수가 임계값에 못 미치는 이슈는 요약하지 않는다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1', debateScore: 40 })],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });
    const textClient = createTextClient();

    const result = await summarizeIssues({ prisma, textClient });

    expect(result).toEqual({ summarized: 0, skipped: 0, failed: [] });
    expect(textClient.requests).toHaveLength(0);
  });

  it('아직 분류되지 않은 이슈는 요약하지 않는다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [createFakeIssueRow({ id: 'issue-1' })],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ summarized: 0, skipped: 0, failed: [] });
  });

  it('자동 제외된 이슈는 대상이 아니다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({ id: 'issue-1', status: IssueStatus.AUTO_REJECTED, debateScore: 90 }),
      ],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ summarized: 0, skipped: 0, failed: [] });
  });

  it('점수가 높은 이슈부터 노출 상한만큼만 요약한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({ id: 'issue-low', debateScore: 65 }),
        createClassifiedIssueRow({ id: 'issue-high', debateScore: 95 }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-low' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-high' }),
      ],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient(), exposeLimit: 1 });

    expect(result.summarized).toBe(1);
    expect(db.issues[1].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[0].question).toBe(UNDECIDED_QUESTION);
  });

  it('issueId 를 지정하면 임계값과 상한을 무시한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1', debateScore: 10 })],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });

    const result = await summarizeIssues({
      prisma,
      textClient: createTextClient(),
      issueId: 'issue-1',
    });

    expect(result.summarized).toBe(1);
    expect(db.issues[0].question).toBe('주 4.5일제를 도입해야 할까?');
  });

  it('분류가 뽑아 둔 사전 추출 요지를 프롬프트에 넣는다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-1',
          classification: {
            isPolicyDebate: true,
            debateScore: 80,
            topic: '노동',
            reason: '노동시간 제도 변경에 찬반이 갈린다.',
            entities: ['국회'],
            keySentences: ['노동시간 단축의 적용 범위가 쟁점이다.', '중소기업 부담이 쟁점이다.', '임금 보전이 쟁점이다.'],
            keyClaims: ['삶의 질이 좋아진다', '비용이 늘어난다', '생산성이 관건이다'],
          },
        }),
      ],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });
    const textClient = createTextClient();

    await summarizeIssues({ prisma, textClient });

    const { userPrompt } = textClient.requests[0];

    expect(userPrompt).toContain('사전 추출 요지');
    expect(userPrompt).toContain('- 쟁점: 노동시간 단축의 적용 범위가 쟁점이다.');
    expect(userPrompt).toContain('- 주장: 비용이 늘어난다');
  });

  it('분류 결과가 없으면 사전 추출 요지를 넣지 않는다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1' })],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
    });
    const textClient = createTextClient();

    await summarizeIssues({ prisma, textClient });

    expect(textClient.requests[0].userPrompt).not.toContain('사전 추출 요지');
  });

  it('기사를 최신순으로 정렬해 상한만큼만 프롬프트에 넣는다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [createClassifiedIssueRow({ id: 'issue-1' })],
      articles: [
        createFakeArticleRow({
          id: 'old',
          issueId: 'issue-1',
          title: '오래된 기사',
          publishedAt: new Date('2026-08-01T00:00:00.000Z'),
        }),
        createFakeArticleRow({
          id: 'new',
          issueId: 'issue-1',
          title: '최신 기사',
          publishedAt: new Date('2026-08-25T00:00:00.000Z'),
        }),
      ],
    });
    const textClient = createTextClient();

    await summarizeIssues({ prisma, textClient, maxArticles: 1 });

    const { userPrompt } = textClient.requests[0];

    expect(userPrompt).toContain('기사 1건');
    expect(userPrompt).toContain('[0] 연합뉴스 · 2026.08.25 · 최신 기사');
    expect(userPrompt).not.toContain('오래된 기사');
  });
});

const CLASSIFY_RESPONSE = {
  isPolicyDebate: true,
  debateScore: 82,
  topic: '재정',
  reason: '예산안 처리 방식에 찬반이 갈린다.',
  entities: ['국회'],
  keySentences: ['예산 규모가 쟁점이다.', '증액 항목이 쟁점이다.', '처리 시한이 쟁점이다.'],
  keyClaims: ['재정 건전성을 지켜야 한다', '경기 부양이 필요하다', '심사 기간이 짧다'],
  duplicateOfIssueId: null,
};

describe('clusterArticles → classifyIssues → summarizeIssues 연속 실행', () => {
  const NOW = new Date('2026-08-28T00:00:00Z');

  const embeddingClient: EmbeddingClient = { embed: async (texts) => texts.map(() => [1, 0]) };

  const recentArticle = (id: string) =>
    createFakeArticleRow({
      id,
      title: '예산안 처리',
      embedding: [1, 0],
      publishedAt: new Date('2026-08-27T00:00:00Z'),
    });

  it('묶어서 만든 DRAFT 이슈를 이어서 요약하고, 기사가 늘면 다시 요약한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      articles: [recentArticle('a1'), recentArticle('a2'), recentArticle('a3')],
    });

    const clustered = await clusterArticles({ prisma, embeddingClient, now: NOW });

    expect(clustered.created).toBe(1);
    expect(db.issues[0].question).toBe(UNDECIDED_QUESTION);

    // 분류를 통과해야 요약 대상이 된다.
    const classified = await classifyIssues({
      prisma,
      nanoTextClient: createFakeTextClient({ [CLASSIFY_SCHEMA_NAME]: [CLASSIFY_RESPONSE] }),
      now: NOW,
    });

    expect(classified.passed).toBe(1);

    const first = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(first.summarized).toBe(1);
    expect(db.issues[0].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[0].summarizedArticleCount).toBe(3);

    // 같은 이슈로 기사가 더 들어오지 않으면 두 번째 실행은 건너뛴다.
    const second = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(second).toEqual({ summarized: 0, skipped: 1, failed: [] });

    // 기사가 30% 이상 늘면 다시 요약한다.
    db.articles.push(recentArticle('a4'), recentArticle('a5'));
    db.articles[3].issueId = db.issues[0].id;
    db.articles[4].issueId = db.issues[0].id;

    const third = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(third.summarized).toBe(1);
    expect(db.issues[0].summarizedArticleCount).toBe(5);
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

describe('summarizeIssues 중복 보류', () => {
  it('중복 쌍은 하나만 요약하고 나머지는 보류 메모만 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-origin',
          question: '정년을 65세로 연장해야 할까?',
          classification: classificationOf(),
        }),
        createClassifiedIssueRow({
          id: 'issue-dup',
          classification: classificationOf('issue-origin'),
        }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-origin' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-dup' }),
      ],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(result).toEqual({ summarized: 1, skipped: 1, failed: [] });
    expect(db.issues[0].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[1].question).toBe(UNDECIDED_QUESTION);
    expect(db.issues[1].reviewNote).toBe('[중복으로 보류] 정년을 65세로 연장해야 할까?');
  });

  it('이미 검수 중인 이슈를 가리키면 보류한다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-dup',
          classification: classificationOf('issue-review'),
        }),
        createFakeIssueRow({
          id: 'issue-review',
          status: IssueStatus.PUBLISHED,
          question: '주 4.5일제를 도입해야 할까?',
        }),
      ],
      articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-dup' })],
    });
    const textClient = createTextClient();

    const result = await summarizeIssues({ prisma, textClient });

    expect(result).toEqual({ summarized: 0, skipped: 1, failed: [] });
    expect(textClient.requests).toHaveLength(0);
    expect(db.issues[0].reviewNote).toBe('[중복으로 보류] 주 4.5일제를 도입해야 할까?');
  });

  it('기존 경고를 지우지 않고 보류 메모를 한 번만 덧붙인다', async () => {
    const { calls, db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-origin',
          question: '정년을 65세로 연장해야 할까?',
          summarizedAt: SUMMARIZED_AT,
          summarizedArticleCount: 1,
          classification: classificationOf(),
        }),
        createClassifiedIssueRow({
          id: 'issue-dup',
          reviewNote: '[중복 가능] 정년을 65세로 연장해야 할까?',
          classification: classificationOf('issue-origin'),
        }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-origin' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-dup' }),
      ],
    });

    await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(db.issues[1].reviewNote).toBe(
      '[중복 가능] 정년을 65세로 연장해야 할까?\n[중복으로 보류] 정년을 65세로 연장해야 할까?',
    );

    // 두 번째 실행은 같은 줄을 다시 쓰지 않는다.
    await summarizeIssues({ prisma, textClient: createTextClient() });

    expect(db.issues[1].reviewNote).toBe(
      '[중복 가능] 정년을 65세로 연장해야 할까?\n[중복으로 보류] 정년을 65세로 연장해야 할까?',
    );
    expect(
      calls.filter((call) => call.model === 'issue' && call.method === 'update'),
    ).toHaveLength(1);
  });

  it('issueId 를 지정하면 중복이어도 보류하지 않는다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-origin',
          question: '정년을 65세로 연장해야 할까?',
          classification: classificationOf(),
        }),
        createClassifiedIssueRow({
          id: 'issue-dup',
          classification: classificationOf('issue-origin'),
        }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-origin' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-dup' }),
      ],
    });

    const result = await summarizeIssues({
      prisma,
      textClient: createTextClient(),
      issueId: 'issue-dup',
    });

    expect(result).toEqual({ summarized: 1, skipped: 0, failed: [] });
    expect(db.issues[1].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[1].reviewNote).toBeNull();
  });

  it('중복 표시가 있는 이슈는 점수가 높아도 뒤로 밀린다', async () => {
    const { db, prisma } = createFakePrismaClient({
      issues: [
        createClassifiedIssueRow({
          id: 'issue-dup',
          debateScore: 95,
          classification: classificationOf('issue-other'),
        }),
        createClassifiedIssueRow({
          id: 'issue-clean',
          debateScore: 65,
          classification: classificationOf(),
        }),
      ],
      articles: [
        createFakeArticleRow({ id: 'a1', issueId: 'issue-dup' }),
        createFakeArticleRow({ id: 'a2', issueId: 'issue-clean' }),
      ],
    });

    const result = await summarizeIssues({ prisma, textClient: createTextClient(), exposeLimit: 1 });

    expect(result.summarized).toBe(1);
    expect(db.issues[1].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(db.issues[0].question).toBe(UNDECIDED_QUESTION);
  });
});
