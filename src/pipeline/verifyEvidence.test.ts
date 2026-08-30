import { describe, expect, it } from 'vitest';

import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { createFakeTextClient } from '@/pipeline/FakeTextClient';
import { VERIFY_SCHEMA_NAME } from '@/pipeline/VerifySchema';
import {
  collectVerificationWarnings,
  unsupportedEvidenceNote,
  verifyEvidence,
  weakSupportNote,
} from '@/pipeline/verifyEvidence';
import {
  createFakeArticleRow,
  createFakeIssueRow,
  createFakePrismaClient,
  type FakeClaimRow,
  type FakeDatabase,
  type FakeEvidenceRow,
} from '@/testing/FakePrismaClient';

const NOW = new Date('2026-08-28T00:00:00.000Z');

const claimRow = (id: string, side: string, order: number): FakeClaimRow => ({
  id,
  issueId: 'issue-1',
  side,
  order,
  title: `${side} 주장 ${order + 1}`,
  description: '설명 문장이다.',
});

const evidenceRow = (id: string, claimId: string): FakeEvidenceRow => ({
  id,
  claimId,
  type: EvidenceType.FACT,
  source: '연합뉴스',
  date: new Date('2026-08-25T00:00:00.000Z'),
  summary: `근거 ${id}`,
  url: 'https://news.example/1',
  articleId: 'a1',
});

const verdict = (evidenceId: string, support: EvidenceSupport) => ({
  evidenceId,
  support,
  type: EvidenceType.RESEARCH,
  note: `${evidenceId} 판정`,
});

const seed = (overrides: Partial<FakeDatabase> = {}): Partial<FakeDatabase> => ({
  issues: [createFakeIssueRow({ id: 'issue-1', question: '주 4.5일제를 도입해야 할까?' })],
  articles: [createFakeArticleRow({ id: 'a1', issueId: 'issue-1' })],
  claims: [claimRow('c1', 'AGREE', 0)],
  evidences: [evidenceRow('e1', 'c1'), evidenceRow('e2', 'c1')],
  ...overrides,
});

const createTextClient = (verdicts: ReturnType<typeof verdict>[]) =>
  createFakeTextClient({ [VERIFY_SCHEMA_NAME]: [{ verdicts }] });

/** 응답 큐가 비어 있어 항상 실패하는 클라이언트. */
const createFailingTextClient = () => createFakeTextClient({});

describe('collectVerificationWarnings', () => {
  const claims = [{ title: '삶의 질이 높아진다', evidences: [{ id: 'e1' }, { id: 'e2' }] }];

  it('미지지 근거가 있으면 건수를 남긴다', () => {
    const warnings = collectVerificationWarnings(
      claims,
      new Map([
        ['e1', EvidenceSupport.SUPPORTS],
        ['e2', EvidenceSupport.UNRELATED],
      ]),
    );

    expect(warnings).toContain(unsupportedEvidenceNote('삶의 질이 높아진다', 1));
  });

  it('지지 근거가 1개 이하면 경고를 한 줄 더 남긴다', () => {
    const warnings = collectVerificationWarnings(
      claims,
      new Map([
        ['e1', EvidenceSupport.SUPPORTS],
        ['e2', EvidenceSupport.CONTRADICTS],
      ]),
    );

    expect(warnings).toContain(weakSupportNote('삶의 질이 높아진다', 1));
  });

  it('지지·부분 근거가 2개 이상이면 경고가 없다', () => {
    const warnings = collectVerificationWarnings(
      claims,
      new Map([
        ['e1', EvidenceSupport.SUPPORTS],
        ['e2', EvidenceSupport.PARTIAL],
      ]),
    );

    expect(warnings).toEqual([]);
  });
});

describe('verifyEvidence', () => {
  it('판정을 근거에 저장하고 검증 시각을 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const textClient = createTextClient([
      verdict('e1', EvidenceSupport.SUPPORTS),
      verdict('e2', EvidenceSupport.PARTIAL),
    ]);

    const result = await verifyEvidence({ prisma, textClient, now: NOW });

    expect(result).toEqual({ verified: 1, flagged: 0, failed: [] });
    expect(db.evidences[0].support).toBe(EvidenceSupport.SUPPORTS);
    expect(db.evidences[0].verificationNote).toBe('e1 판정');
    expect(db.evidences[0].type).toBe(EvidenceType.RESEARCH);
    expect(db.issues[0].verifiedAt).toEqual(NOW);
    expect(db.issues[0].reviewNote).toBeNull();
  });

  it('미지지 근거를 삭제하지 않고 경고만 누적한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const textClient = createTextClient([
      verdict('e1', EvidenceSupport.SUPPORTS),
      verdict('e2', EvidenceSupport.UNRELATED),
    ]);

    const result = await verifyEvidence({ prisma, textClient, now: NOW });

    expect(result.flagged).toBe(1);
    expect(db.evidences).toHaveLength(2);
    expect(db.evidences[1].support).toBe(EvidenceSupport.UNRELATED);
    expect(db.issues[0].reviewNote).toContain(unsupportedEvidenceNote('AGREE 주장 1', 1));
    expect(db.issues[0].reviewNote).toContain(weakSupportNote('AGREE 주장 1', 1));
  });

  it('기존 검수 메모 아래에 경고를 덧붙인다', async () => {
    const { db, prisma } = createFakePrismaClient(
      seed({
        issues: [createFakeIssueRow({ id: 'issue-1', question: '질문?', reviewNote: '이전 메모' })],
      }),
    );
    const textClient = createTextClient([
      verdict('e1', EvidenceSupport.CONTRADICTS),
      verdict('e2', EvidenceSupport.UNRELATED),
    ]);

    await verifyEvidence({ prisma, textClient, now: NOW });

    expect(db.issues[0].reviewNote?.startsWith('이전 메모\n')).toBe(true);
  });

  it('입력에 없는 근거 id 는 무시한다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());
    const textClient = createTextClient([
      verdict('지어낸-id', EvidenceSupport.SUPPORTS),
      verdict('e1', EvidenceSupport.SUPPORTS),
    ]);

    const result = await verifyEvidence({ prisma, textClient, now: NOW });

    expect(result.verified).toBe(1);
    expect(db.evidences[1].support).toBeUndefined();
  });

  it('이미 검증된 이슈는 대상이 아니다', async () => {
    const { prisma } = createFakePrismaClient(
      seed({
        issues: [
          createFakeIssueRow({
            id: 'issue-1',
            question: '질문?',
            verifiedAt: new Date('2026-08-27T00:00:00.000Z'),
          }),
        ],
      }),
    );
    const textClient = createTextClient([verdict('e1', EvidenceSupport.SUPPORTS)]);

    const result = await verifyEvidence({ prisma, textClient, now: NOW });

    expect(result).toEqual({ verified: 0, flagged: 0, failed: [] });
    expect(textClient.requests).toHaveLength(0);
  });

  it('근거가 하나도 없는 이슈는 건너뛴다', async () => {
    const { prisma } = createFakePrismaClient(seed({ claims: [claimRow('c1', 'AGREE', 0)], evidences: [] }));
    const textClient = createTextClient([verdict('e1', EvidenceSupport.SUPPORTS)]);

    const result = await verifyEvidence({ prisma, textClient, now: NOW });

    expect(result.verified).toBe(0);
    expect(textClient.requests).toHaveLength(0);
  });

  it('한 이슈가 실패해도 실패 원인을 남기고 검증 시각을 쓰지 않는다', async () => {
    const { db, prisma } = createFakePrismaClient(seed());

    const result = await verifyEvidence({ prisma, textClient: createFailingTextClient(), now: NOW });

    expect(result.verified).toBe(0);
    expect(result.flagged).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].issueId).toBe('issue-1');
    expect(result.failed[0].message).toContain('Error');
    expect(db.issues[0].verifiedAt).toBeNull();
  });

  it('주장과 근거, 원문 기사를 프롬프트에 넣는다', async () => {
    const { prisma } = createFakePrismaClient(seed());
    const textClient = createTextClient([verdict('e1', EvidenceSupport.SUPPORTS)]);

    await verifyEvidence({ prisma, textClient, now: NOW });

    const { userPrompt } = textClient.requests[0];

    expect(userPrompt).toContain('주장 1 (찬성): AGREE 주장 1');
    expect(userPrompt).toContain('id: e1');
    expect(userPrompt).toContain('원문 기사: 기사 a1 — 설명 a1');
  });
});
