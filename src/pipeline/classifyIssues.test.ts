import { IssueStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  autoRejectedNote,
  classifyIssues,
  duplicateNote,
  shouldClassify,
} from '@/pipeline/classifyIssues';
import { CLASSIFY_SCHEMA_NAME } from '@/pipeline/ClassifySchema';
import { createFakeTextClient } from '@/pipeline/FakeTextClient';
import {
  createFakeArticleRow,
  createFakeIssueRow,
  createFakePrismaClient,
} from '@/testing/FakePrismaClient';

const NOW = new Date('2026-08-28T00:00:00.000Z');

const CLASSIFY_RESPONSE = {
  isPolicyDebate: true,
  debateScore: 82,
  topic: '노동',
  reason: '노동시간 제도 변경에 찬반이 갈린다.',
  entities: ['국회', '고용노동부'],
  keySentences: ['적용 범위가 쟁점이다.', '중소기업 부담이 쟁점이다.', '임금 보전이 쟁점이다.'],
  keyClaims: ['삶의 질이 좋아진다', '비용이 늘어난다', '생산성이 관건이다'],
  duplicateOfIssueId: null,
};

const createNanoClient = (response: Record<string, unknown> = CLASSIFY_RESPONSE) =>
  createFakeTextClient({ [CLASSIFY_SCHEMA_NAME]: [response] });

/** 응답 큐가 비어 있어 항상 실패하는 클라이언트. */
const createFailingNanoClient = () => createFakeTextClient({});

const seed = () => ({
  issues: [createFakeIssueRow({ id: 'issue-1', question: '주 4.5일제를 도입해야 할까?' })],
  articles: [
    createFakeArticleRow({ id: 'a1', issueId: 'issue-1' }),
    createFakeArticleRow({ id: 'a2', issueId: 'issue-1' }),
  ],
});

describe('shouldClassify', () => {
  const collectedAt = new Date('2026-08-25T00:00:00.000Z');

  it('기사가 없으면 분류하지 않는다', () => {
    expect(shouldClassify({ classifiedAt: null }, [])).toBe(false);
  });

  it('한 번도 분류된 적이 없으면 분류한다', () => {
    expect(shouldClassify({ classifiedAt: null }, [{ collectedAt }])).toBe(true);
  });

  it('분류 이후 새로 수집된 기사가 없으면 건너뛴다', () => {
    expect(shouldClassify({ classifiedAt: new Date('2026-08-26T00:00:00.000Z') }, [{ collectedAt }])).toBe(
      false,
    );
  });

  it('분류 이후 기사가 더 붙었으면 다시 분류한다', () => {
    expect(shouldClassify({ classifiedAt: new Date('2026-08-24T00:00:00.000Z') }, [{ collectedAt }])).toBe(
      true,
    );
  });
});

describe('classifyIssues', () => {
  it('임계값을 넘으면 DRAFT 로 두고 분류 결과를 저장한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    const result = await classifyIssues({ prisma, nanoTextClient: createNanoClient(), now: NOW });

    expect(result).toEqual({ classified: 1, passed: 1, autoRejected: 0, duplicates: 0, failed: [] });
    expect(db.issues[0].status).toBe(IssueStatus.DRAFT);
    expect(db.issues[0].debateScore).toBe(82);
    expect(db.issues[0].topic).toBe('노동');
    expect(db.issues[0].classifiedAt).toEqual(NOW);
    expect(db.issues[0].classification).toMatchObject({ isPolicyDebate: true, reason: CLASSIFY_RESPONSE.reason });
    expect(db.issues[0].reviewNote).toBeNull();
  });

  it('정책 논쟁이 아니면 자동 제외하고 판정 근거를 메모에 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const nanoTextClient = createNanoClient({
      ...CLASSIFY_RESPONSE,
      isPolicyDebate: false,
      debateScore: 20,
      reason: '결과를 점치는 예측형 보도다.',
    });

    const result = await classifyIssues({ prisma, nanoTextClient, now: NOW });

    expect(result).toMatchObject({ classified: 1, passed: 0, autoRejected: 1 });
    expect(db.issues[0].status).toBe(IssueStatus.AUTO_REJECTED);
    expect(db.issues[0].reviewNote).toBe(autoRejectedNote('결과를 점치는 예측형 보도다.'));
  });

  it('점수가 임계값에 못 미치면 정책 논쟁이어도 자동 제외한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const nanoTextClient = createNanoClient({ ...CLASSIFY_RESPONSE, debateScore: 59 });

    const result = await classifyIssues({ prisma, nanoTextClient, now: NOW, debateThreshold: 60 });

    expect(result.autoRejected).toBe(1);
    expect(db.issues[0].status).toBe(IssueStatus.AUTO_REJECTED);
    expect(db.issues[0].debateScore).toBe(59);
  });

  it('임계값을 바꾸면 통과 여부도 바뀐다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const nanoTextClient = createNanoClient({ ...CLASSIFY_RESPONSE, debateScore: 59 });

    await classifyIssues({ prisma, nanoTextClient, now: NOW, debateThreshold: 50 });

    expect(db.issues[0].status).toBe(IssueStatus.DRAFT);
  });

  it('중복으로 보이는 이슈가 있으면 경고만 남기고 병합하지 않는다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        ...base.issues,
        createFakeIssueRow({ id: 'issue-2', question: '주 4일제를 도입해야 할까?' }),
      ],
    });
    const nanoTextClient = createNanoClient({ ...CLASSIFY_RESPONSE, duplicateOfIssueId: 'issue-2' });

    const result = await classifyIssues({ prisma, nanoTextClient, now: NOW });

    expect(result.duplicates).toBe(1);
    expect(db.issues[0].status).toBe(IssueStatus.DRAFT);
    expect(db.issues[0].reviewNote).toBe(duplicateNote('주 4일제를 도입해야 할까?'));
    expect(db.issues[0].classification).toMatchObject({ duplicateOfIssueId: 'issue-2' });
  });

  it('존재하지 않는 중복 이슈 id 는 무시한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const nanoTextClient = createNanoClient({ ...CLASSIFY_RESPONSE, duplicateOfIssueId: '지어낸-id' });

    const result = await classifyIssues({ prisma, nanoTextClient, now: NOW });

    expect(result.duplicates).toBe(0);
    expect(db.issues[0].reviewNote).toBeNull();
    expect(db.issues[0].classification).not.toHaveProperty('duplicateOfIssueId');
  });

  it('기존 이슈 목록을 프롬프트에 넣는다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      issues: [
        ...base.issues,
        createFakeIssueRow({ id: 'issue-2', question: '주 4일제를 도입해야 할까?', topic: '노동' }),
      ],
    });
    const nanoTextClient = createNanoClient();

    await classifyIssues({ prisma, nanoTextClient, now: NOW });

    expect(nanoTextClient.requests[0].userPrompt).toContain('[issue-2] 노동 · 주 4일제를 도입해야 할까?');
  });

  it('이미 분류됐고 새 기사가 없으면 건너뛴다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createFakeIssueRow({
          id: 'issue-1',
          question: '주 4.5일제를 도입해야 할까?',
          classifiedAt: new Date('2026-08-27T00:00:00.000Z'),
        }),
      ],
    });
    const nanoTextClient = createNanoClient();

    const result = await classifyIssues({ prisma, nanoTextClient, now: NOW });

    expect(result).toEqual({ classified: 0, passed: 0, autoRejected: 0, duplicates: 0, failed: [] });
    expect(nanoTextClient.requests).toHaveLength(0);
  });

  it('기사가 없는 이슈는 건너뛴다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [createFakeIssueRow({ id: 'issue-1', question: '질문?' })],
    });
    const nanoTextClient = createNanoClient();

    const result = await classifyIssues({ prisma, nanoTextClient, now: NOW });

    expect(result.classified).toBe(0);
    expect(nanoTextClient.requests).toHaveLength(0);
  });

  it('검수 대기·승인된 이슈는 자동 대상이 아니다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createFakeIssueRow({ id: 'issue-1', status: IssueStatus.REVIEW, question: '질문?' }),
      ],
    });

    const result = await classifyIssues({ prisma, nanoTextClient: createNanoClient(), now: NOW });

    expect(result.classified).toBe(0);
  });

  it('한 이슈가 실패해도 나머지는 계속 분류하고 실패한 id 를 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    const result = await classifyIssues({
      prisma,
      nanoTextClient: createFailingNanoClient(),
      now: NOW,
    });

    expect(result).toEqual({
      classified: 0,
      passed: 0,
      autoRejected: 0,
      duplicates: 0,
      failed: ['issue-1'],
    });
    expect(db.issues[0].debateScore).toBeNull();
    expect(db.issues[0].status).toBe(IssueStatus.DRAFT);
  });

  it('issueId 를 지정하면 이미 분류된 이슈도 다시 분류한다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createFakeIssueRow({
          id: 'issue-1',
          question: '질문?',
          classifiedAt: new Date('2026-08-27T00:00:00.000Z'),
        }),
      ],
    });

    const result = await classifyIssues({
      prisma,
      nanoTextClient: createNanoClient(),
      issueId: 'issue-1',
      now: NOW,
    });

    expect(result.classified).toBe(1);
    expect(db.issues[0].debateScore).toBe(82);
  });
});
