import { describe, expect, it } from 'vitest';

import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { EXTRACT_SCHEMA_NAME } from '@/pipeline/ExtractSchema';
import {
  createFakeArticleRow,
  createFakeIssueRow,
  createFakePrismaClient,
} from '@/testing/FakePrismaClient';
import { createFakeTextClient } from '@/pipeline/FakeTextClient';
import { regenerateIssue } from '@/pipeline/regenerateIssue';
import { RegenerateNotAllowedError } from '@/pipeline/RegenerateNotAllowedError';
import { SUMMARIZE_SCHEMA_NAME } from '@/pipeline/SummarizeSchema';
import { VERIFY_SCHEMA_NAME } from '@/pipeline/VerifySchema';

const SUMMARY_RESPONSE = {
  question: '다시 만든 질문은 무엇일까?',
  tags: ['노동', '경제'],
  summary: ['첫 문장이다.', '두 번째 문장이다.', '세 번째 문장이다.'],
  keyPoints: [
    { title: '쟁점 1', question: '질문 1?' },
    { title: '쟁점 2', question: '질문 2?' },
    { title: '쟁점 3', question: '질문 3?' },
    { title: '쟁점 4', question: '질문 4?' },
  ],
};

const claimOf = (side: ClaimSide, index: number) => ({
  side,
  title: `${side} 주장 ${index}`,
  description: '설명 문장이다. 두 번째 문장이다.',
  evidences: [
    { articleIndex: 0, type: EvidenceType.FACT, summary: '근거 1' },
    { articleIndex: 1, type: EvidenceType.CLAIM, summary: '근거 2' },
  ],
});

const groupOf = (share: number) => ({
  label: '라벨',
  share,
  description: '설명',
  agreesWith: [0],
  disagreesWith: [3],
  mostDivided: [1],
});

const EXTRACT_RESPONSE = {
  claims: [
    claimOf(ClaimSide.AGREE, 1),
    claimOf(ClaimSide.AGREE, 2),
    claimOf(ClaimSide.AGREE, 3),
    claimOf(ClaimSide.DISAGREE, 1),
    claimOf(ClaimSide.DISAGREE, 2),
    claimOf(ClaimSide.DISAGREE, 3),
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      frame: '프레임',
      keywords: ['하나', '둘', '셋'],
      representativeArticleIndex: 0,
    },
  ],
  commonCoverage: ['공통 1', '공통 2'],
  opinionGroups: [groupOf(40), groupOf(35), groupOf(25)],
};

/**
 * 근거 id 는 주장을 저장한 뒤에야 정해지므로 고정 응답으로는 맞출 수 없다.
 * 모르는 id 는 `verifyEvidence` 가 버리므로, 여기서는 검증 단계가 실제로 불리는지만 본다.
 */
const VERIFY_RESPONSE = {
  verdicts: [
    {
      evidenceId: 'unknown-evidence',
      support: EvidenceSupport.SUPPORTS,
      type: EvidenceType.FACT,
      note: '판정 근거 한 줄이다.',
    },
  ],
};

const createTextClient = () =>
  createFakeTextClient({
    [SUMMARIZE_SCHEMA_NAME]: [SUMMARY_RESPONSE],
    [EXTRACT_SCHEMA_NAME]: [EXTRACT_RESPONSE],
    [VERIFY_SCHEMA_NAME]: [VERIFY_RESPONSE],
  });

const seed = () => ({
  issues: [
    createFakeIssueRow({
      id: 'issue-1',
      status: 'REVIEW',
      question: '예전 질문?',
      reviewNote: '예전 경고',
    }),
  ],
  articles: [
    createFakeArticleRow({
      id: 'a1',
      issueId: 'issue-1',
      publisher: '한겨레',
      originalLink: 'https://www.hani.co.kr/1',
      publishedAt: new Date('2026-08-25T00:00:00.000Z'),
    }),
    createFakeArticleRow({
      id: 'a2',
      issueId: 'issue-1',
      publisher: '조선일보',
      originalLink: 'https://www.chosun.com/2',
      publishedAt: new Date('2026-08-24T00:00:00.000Z'),
    }),
  ],
  claims: [
    { id: 'claim-old', issueId: 'issue-1', side: 'AGREE', order: 0, title: '예전 주장', description: '설명' },
  ],
  publishers: [{ id: 'p1', domain: 'hani.co.kr', name: '한겨레', leaning: 'PROGRESSIVE' }],
});

describe('regenerateIssue', () => {
  it('이슈를 초안으로 되돌리고 요약·추출·연결을 다시 실행한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await regenerateIssue({ prisma, textClient: createTextClient(), issueId: 'issue-1' });

    expect(db.issues[0].question).toBe('다시 만든 질문은 무엇일까?');
    expect(db.issues[0].status).toBe('REVIEW');
    expect(db.claims).toHaveLength(6);
    expect(db.claims.some((claim) => claim.id === 'claim-old')).toBe(false);
    expect(db.evidences).toHaveLength(12);
  });

  it('예전 검수 메모를 지우지 않고 재생성 줄을 덧붙인다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await regenerateIssue({
      prisma,
      textClient: createTextClient(),
      issueId: 'issue-1',
      now: new Date('2026-08-28T00:00:00.000Z'),
    });

    expect(db.issues[0].reviewNote).toContain('예전 경고');
    expect(db.issues[0].reviewNote).toContain('[재생성 2026-08-28]');
  });

  it('승인된 이슈는 다시 생성할 수 없다', async () => {
    const base = seed();
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [
        createFakeIssueRow({
          id: 'issue-1',
          status: 'PUBLISHED',
          question: '예전 질문?',
        }),
      ],
    });

    await expect(
      regenerateIssue({ prisma, textClient: createTextClient(), issueId: 'issue-1' }),
    ).rejects.toBeInstanceOf(RegenerateNotAllowedError);
    expect(db.issues[0].question).toBe('예전 질문?');
    expect(db.claims.map((claim) => claim.id)).toEqual(['claim-old']);
  });

  it('반려된 이슈도 다시 생성할 수 없다', async () => {
    const base = seed();
    const { prisma } = createFakePrismaClient({
      ...base,
      issues: [createFakeIssueRow({ id: 'issue-1', status: 'REJECTED', question: '예전 질문?' })],
    });

    await expect(
      regenerateIssue({ prisma, textClient: createTextClient(), issueId: 'issue-1' }),
    ).rejects.toBeInstanceOf(RegenerateNotAllowedError);
  });

  it('LLM 이 실패하면 기존 주장·요약을 그대로 둔다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await expect(
      regenerateIssue({ prisma, textClient: createFakeTextClient({}), issueId: 'issue-1' }),
    ).rejects.toBeTruthy();
    expect(db.issues[0].question).toBe('예전 질문?');
    expect(db.issues[0].reviewNote).toBe('예전 경고');
    expect(db.claims.map((claim) => claim.id)).toEqual(['claim-old']);
  });

  it('논점 추출이 실패해도 요약을 저장하지 않는다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    // 요약 응답만 주고 추출 응답은 주지 않아 두 번째 호출에서 실패시킨다.
    const textClient = createFakeTextClient({ [SUMMARIZE_SCHEMA_NAME]: [SUMMARY_RESPONSE] });

    await expect(
      regenerateIssue({ prisma, textClient, issueId: 'issue-1' }),
    ).rejects.toBeTruthy();
    expect(db.issues[0].question).toBe('예전 질문?');
    expect(db.claims.map((claim) => claim.id)).toEqual(['claim-old']);
  });

  it('요약·추출·검증을 각각 한 번씩만 호출한다', async () => {
    const { prisma } = createFakePrismaClient(seed());
    const textClient = createTextClient();

    await regenerateIssue({ prisma, textClient, issueId: 'issue-1' });

    expect(textClient.requests.map((request) => request.schemaName)).toEqual([
      SUMMARIZE_SCHEMA_NAME,
      EXTRACT_SCHEMA_NAME,
      VERIFY_SCHEMA_NAME,
    ]);
  });

  it('근거 검증까지 이어서 실행해 검증 시각을 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    await regenerateIssue({ prisma, textClient: createTextClient(), issueId: 'issue-1' });

    expect(db.issues[0].verifiedAt).toBeInstanceOf(Date);
  });

  it('분류 결과는 그대로 두고 다시 만들지 않는다', async () => {
    const base = seed();
    const classification = {
      isPolicyDebate: true,
      debateScore: 80,
      topic: '노동',
      reason: '제도 변경에 찬반이 갈린다.',
      entities: ['국회'],
      keySentences: ['적용 범위가 쟁점이다.', '부담이 쟁점이다.', '보전이 쟁점이다.'],
      keyClaims: ['찬성 요지', '반대 요지', '중립 요지'],
    };
    const { db, prisma } = createFakePrismaClient({
      ...base,
      issues: [{ ...base.issues[0], debateScore: 80, topic: '노동', classification }],
    });
    const textClient = createTextClient();

    await regenerateIssue({ prisma, textClient, issueId: 'issue-1' });

    expect(db.issues[0].debateScore).toBe(80);
    expect(db.issues[0].classification).toEqual(classification);
    expect(textClient.requests.some((request) => request.schemaName === 'issue_classification')).toBe(
      false,
    );
    expect(textClient.requests[0].userPrompt).toContain('사전 추출 요지');
  });
});
