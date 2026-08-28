import { IssueStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { clusterArticles } from '@/pipeline/clusterArticles';
import type { EmbeddingClient } from '@/pipeline/EmbeddingClient';
import {
  countCalls,
  createFakeArticleRow,
  createFakeIssueRow,
  createFakePrismaClient,
  type FakeArticleRow,
  type FakeIssueRow,
} from '@/testing/FakePrismaClient';

const NOW = new Date('2026-08-28T00:00:00Z');

const RECENT = new Date('2026-08-27T00:00:00Z');

const OLD = new Date('2026-08-01T00:00:00Z');

/** 단어 → 고정 벡터. 임베딩을 결정적으로 만들어 클러스터 결과를 검증한다. */
const VECTOR_BY_KEYWORD: Record<string, number[]> = {
  예산: [1, 0],
  외교: [0, 1],
  기울기: [0.6, 0.8],
  삼차원: [1, 0, 0],
};

/** 아는 단어가 없으면 빈 벡터를 돌려준다(임베딩 실패 상황). */
const createFakeEmbeddingClient = (): EmbeddingClient => ({
  embed: async (texts) =>
    texts.map((text) => {
      const found = Object.entries(VECTOR_BY_KEYWORD).find(([keyword]) => text.includes(keyword));

      return found ? [...found[1]] : [];
    }),
});

const article = (overrides: Partial<FakeArticleRow> & { id: string }): FakeArticleRow =>
  createFakeArticleRow({
    title: '예산안 처리',
    description: '설명',
    publishedAt: RECENT,
    ...overrides,
  });

const issue = (overrides: Partial<FakeIssueRow> & { id: string }): FakeIssueRow =>
  createFakeIssueRow({ status: IssueStatus.DRAFT, ...overrides });

describe('clusterArticles', () => {
  it('임베딩이 빈 기사에 제목+설명 임베딩을 채운다', async () => {
    const { prisma, db } = createFakePrismaClient({
      articles: [article({ id: 'a1', title: '예산안', description: '국회' })],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
    });

    expect(result.embedded).toBe(1);
    expect(db.articles[0].embedding).toEqual([1, 0]);
  });

  it('유사한 최근 이슈에 배정하고 centroid 를 이동 평균으로 갱신한다', async () => {
    const { prisma, db } = createFakePrismaClient({
      issues: [issue({ id: 'seed-1', status: IssueStatus.PUBLISHED, centroid: [1, 0] })],
      articles: [
        article({ id: 'assigned', embedding: [1, 0], issueId: 'seed-1' }),
        article({ id: 'a1', title: '기울기', embedding: [0.6, 0.8] }),
      ],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
      similarityThreshold: 0.5,
    });

    expect(result).toEqual({
      embedded: 0,
      assigned: 1,
      created: 0,
      deferred: 0,
      skippedDimension: 0,
    });
    expect(db.articles[1].issueId).toBe('seed-1');
    expect(db.issues[0].centroid).toEqual([0.8, 0.4]);
  });

  it('최근 14일 안에 기사가 없는 이슈에는 배정하지 않는다', async () => {
    const { prisma, db } = createFakePrismaClient({
      issues: [issue({ id: 'seed-1', centroid: [1, 0] })],
      articles: [
        article({ id: 'old', embedding: [1, 0], issueId: 'seed-1', publishedAt: OLD }),
        article({ id: 'a1', embedding: [1, 0] }),
      ],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
    });

    expect(result.assigned).toBe(0);
    expect(result.deferred).toBe(1);
    expect(db.issues[0].centroid).toEqual([1, 0]);
  });

  it('묶인 기사가 최소 크기 이상이면 DRAFT 이슈를 만들고 배정한다', async () => {
    const { prisma, db } = createFakePrismaClient({
      articles: [
        article({ id: 'a1', title: '예산안', embedding: [1, 0] }),
        article({ id: 'a2', title: '예산 국회', embedding: [1, 0] }),
        article({ id: 'a3', title: '기울기', embedding: [0.6, 0.8] }),
        article({ id: 'a4', title: '외교 회담', embedding: [0, 1] }),
      ],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
      similarityThreshold: 0.5,
      minClusterSize: 3,
    });

    expect(result).toEqual({
      embedded: 0,
      assigned: 3,
      created: 1,
      deferred: 1,
      skippedDimension: 0,
    });
    expect(db.issues).toHaveLength(1);
    expect(db.issues[0]).toMatchObject({
      status: IssueStatus.DRAFT,
      question: '(미정)',
      tags: [],
      summary: [],
      keyPoints: [],
      commonCoverage: [],
      mediaPerspectives: [],
      opinionGroups: [],
    });
    expect(db.issues[0].centroid).toEqual([(1 + 1 + 0.6) / 3, (0 + 0 + 0.8) / 3]);
    expect(
      db.articles.filter((row) => row.issueId === db.issues[0].id).map((row) => row.id),
    ).toEqual(['a1', 'a2', 'a3']);
  });

  it('최소 크기 미만이면 이슈를 만들지 않고 보류한다', async () => {
    const { prisma, db } = createFakePrismaClient({
      articles: [
        article({ id: 'a1', title: '예산안', embedding: [1, 0] }),
        article({ id: 'a2', title: '예산 국회', embedding: [1, 0] }),
      ],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
      minClusterSize: 3,
    });

    expect(result).toEqual({
      embedded: 0,
      assigned: 0,
      created: 0,
      deferred: 2,
      skippedDimension: 0,
    });
    expect(db.issues).toHaveLength(0);
    expect(db.articles.every((row) => row.issueId === null)).toBe(true);
  });

  it('기대 차원과 다른 임베딩은 배정·묶기에서 제외한다', async () => {
    const { prisma, db } = createFakePrismaClient({
      issues: [issue({ id: 'seed-1', centroid: [1, 0] })],
      articles: [
        article({ id: 'recent', embedding: [1, 0], issueId: 'seed-1' }),
        article({ id: 'a1', embedding: [1, 0, 0] }),
      ],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
      similarityThreshold: 0.5,
      expectedDimension: 2,
    });

    expect(result.skippedDimension).toBe(1);
    expect(result.assigned).toBe(0);
    expect(db.articles[1].issueId).toBeNull();
  });

  it('기대 차원을 주지 않으면 첫 유효 임베딩의 길이를 기준으로 삼는다', async () => {
    const { prisma } = createFakePrismaClient({
      articles: [
        article({ id: 'a1', embedding: [1, 0], publishedAt: new Date('2026-08-26T00:00:00Z') }),
        article({ id: 'a2', embedding: [1, 0, 0], publishedAt: RECENT }),
      ],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
      minClusterSize: 1,
      similarityThreshold: 0.5,
    });

    expect(result.skippedDimension).toBe(1);
    expect(result.created).toBe(1);
  });

  it('임베딩을 만들지 못한 기사는 보류로 센다', async () => {
    const { prisma } = createFakePrismaClient({
      articles: [article({ id: 'a1', title: '스포츠 소식', description: '야구' })],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
    });

    expect(result).toEqual({
      embedded: 0,
      assigned: 0,
      created: 0,
      deferred: 1,
      skippedDimension: 0,
    });
  });

  it('centroid 는 이슈별로 배치 끝에 한 번만 갱신한다', async () => {
    const { prisma, calls } = createFakePrismaClient({
      issues: [issue({ id: 'seed-1', centroid: [1, 0] })],
      articles: [
        article({ id: 'seeded', embedding: [1, 0], issueId: 'seed-1' }),
        article({ id: 'a1', embedding: [1, 0] }),
        article({ id: 'a2', embedding: [1, 0] }),
      ],
    });

    const result = await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
      similarityThreshold: 0.5,
    });

    expect(result.assigned).toBe(2);
    expect(countCalls(calls, 'issue', 'update')).toBe(1);
    expect(countCalls(calls, 'article', 'updateMany')).toBe(1);
  });

  it('미배정 기사 조회는 한 실행 상한만큼만 가져온다', async () => {
    const { prisma, calls } = createFakePrismaClient({
      articles: [article({ id: 'a1', embedding: [1, 0] })],
    });

    await clusterArticles({
      prisma,
      embeddingClient: createFakeEmbeddingClient(),
      now: NOW,
      maxArticlesPerRun: 500,
    });

    const findManyCalls = calls.filter((call) => call.model === 'article' && call.method === 'findMany');

    expect(findManyCalls.every((call) => (call.args as { take?: number }).take === 500)).toBe(true);
  });
});
