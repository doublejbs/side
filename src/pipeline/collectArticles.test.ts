import { describe, expect, it } from 'vitest';

import { collectArticles } from '@/pipeline/collectArticles';
import type { NaverNewsClient, NaverNewsItem } from '@/pipeline/NaverNewsClient';
import {
  createFakeArticleRow,
  createFakePrismaClient,
  type FakeDatabase,
} from '@/testing/FakePrismaClient';

interface FakePrismaOptions {
  keywords?: string[];
  publishers?: { domain: string; name: string }[];
  existingLinks?: string[];
}

const createPrisma = (options: FakePrismaOptions = {}) => {
  const seed: Partial<FakeDatabase> = {
    searchQueries: (options.keywords ?? ['예산안']).map((keyword, index) => ({
      id: `q${index}`,
      keyword,
      isActive: true,
      createdAt: new Date('2026-08-01T00:00:00Z'),
    })),
    publishers: (options.publishers ?? []).map((publisher, index) => ({
      id: `p${index}`,
      domain: publisher.domain,
      name: publisher.name,
      leaning: null,
    })),
    articles: (options.existingLinks ?? []).map((link, index) =>
      createFakeArticleRow({ id: `existing-${index}`, naverLink: link }),
    ),
  };

  return createFakePrismaClient(seed);
};

const createFakeNewsClient = (pages: NaverNewsItem[][]): NaverNewsClient & { calls: unknown[][] } => {
  const calls: unknown[][] = [];
  let index = 0;

  return {
    calls,
    search: async (query, searchOptions) => {
      calls.push([query, searchOptions]);

      const page = pages[index] ?? [];

      index += 1;

      return page;
    },
  };
};

const item = (overrides: Partial<NaverNewsItem> = {}): NaverNewsItem => ({
  title: '<b>예산안</b> 처리 무산',
  originallink: 'https://www.hani.co.kr/arti/1',
  link: 'https://n.news.naver.com/article/1',
  description: '여야가 &quot;합의&quot;에 실패했다',
  pubDate: 'Thu, 28 Aug 2026 10:15:00 +0900',
  ...overrides,
});

/** 이번 실행에서 새로 저장된 기사(시드로 넣어 둔 기존 기사 제외). */
const insertedArticles = (db: FakeDatabase) =>
  db.articles.filter((article) => !article.id.startsWith('existing-'));

describe('collectArticles', () => {
  it('활성 키워드로 수집해 HTML 을 제거하고 저장한다', async () => {
    const { prisma, db } = createPrisma();
    const newsClient = createFakeNewsClient([[item()]]);

    const result = await collectArticles({ prisma, newsClient, pagesPerQuery: 1, display: 100 });

    expect(result).toEqual({ queries: 1, fetched: 1, inserted: 1, skipped: 0 });
    expect(insertedArticles(db)[0]).toMatchObject({
      naverLink: 'https://n.news.naver.com/article/1',
      originalLink: 'https://www.hani.co.kr/arti/1',
      title: '예산안 처리 무산',
      description: '여야가 "합의"에 실패했다',
      publisher: '한겨레',
      publishedAt: new Date('2026-08-28T01:15:00.000Z'),
    });
  });

  it('Publisher 테이블의 매체명이 시드보다 우선한다', async () => {
    const { prisma, db } = createPrisma({
      publishers: [{ domain: 'WWW.Hani.co.kr', name: '한겨레신문' }],
    });
    const newsClient = createFakeNewsClient([[item()]]);

    await collectArticles({ prisma, newsClient, pagesPerQuery: 1 });

    expect(insertedArticles(db)[0].publisher).toBe('한겨레신문');
  });

  it('시드에도 없는 도메인은 도메인 문자열을 쓴다', async () => {
    const { prisma, db } = createPrisma();
    const newsClient = createFakeNewsClient([
      [item({ originallink: 'https://www.unknown-news.example/a/1' })],
    ]);

    await collectArticles({ prisma, newsClient, pagesPerQuery: 1 });

    expect(insertedArticles(db)[0].publisher).toBe('unknown-news.example');
  });

  it('이미 저장된 naverLink 와 중복 항목은 건너뛴다', async () => {
    const { prisma, db } = createPrisma({
      existingLinks: ['https://n.news.naver.com/article/1'],
    });
    const newsClient = createFakeNewsClient([
      [
        item(),
        item({ link: 'https://n.news.naver.com/article/2' }),
        item({ link: 'https://n.news.naver.com/article/2' }),
      ],
    ]);

    const result = await collectArticles({ prisma, newsClient, pagesPerQuery: 1 });

    expect(result).toEqual({ queries: 1, fetched: 3, inserted: 1, skipped: 2 });
    expect(insertedArticles(db).map((article) => article.naverLink)).toEqual([
      'https://n.news.naver.com/article/2',
    ]);
  });

  it('발행일을 파싱할 수 없는 기사는 건너뛴다', async () => {
    const { prisma, db } = createPrisma();
    const newsClient = createFakeNewsClient([[item({ pubDate: '어제' })]]);

    const result = await collectArticles({ prisma, newsClient, pagesPerQuery: 1 });

    expect(result).toEqual({ queries: 1, fetched: 1, inserted: 0, skipped: 1 });
    expect(insertedArticles(db)).toHaveLength(0);
  });

  it('키워드마다 지정한 페이지 수만큼 start 를 늘려 조회한다', async () => {
    const { prisma } = createPrisma({ keywords: ['예산안'] });
    const fullPage = Array.from({ length: 2 }, (_unused, index) =>
      item({ link: `https://n.news.naver.com/article/${index}` }),
    );
    const newsClient = createFakeNewsClient([fullPage, fullPage, fullPage]);

    await collectArticles({ prisma, newsClient, pagesPerQuery: 3, display: 2 });

    expect(newsClient.calls).toEqual([
      ['예산안', { display: 2, start: 1 }],
      ['예산안', { display: 2, start: 3 }],
      ['예산안', { display: 2, start: 5 }],
    ]);
  });

  it('페이지가 display 보다 적게 오면 다음 페이지를 조회하지 않는다', async () => {
    const { prisma } = createPrisma();
    const newsClient = createFakeNewsClient([[item()]]);

    await collectArticles({ prisma, newsClient, pagesPerQuery: 3, display: 100 });

    expect(newsClient.calls).toHaveLength(1);
  });

  it('display 가 API 상한을 넘으면 100 으로 잘라 조회한다', async () => {
    const { prisma } = createPrisma();
    const newsClient = createFakeNewsClient([[item()]]);

    await collectArticles({ prisma, newsClient, pagesPerQuery: 1, display: 500 });

    expect(newsClient.calls).toEqual([['예산안', { display: 100, start: 1 }]]);
  });

  it('display 가 1 미만이면 1 로 올려 조회한다', async () => {
    const { prisma } = createPrisma();
    const newsClient = createFakeNewsClient([[item()]]);

    await collectArticles({ prisma, newsClient, pagesPerQuery: 1, display: 0 });

    expect(newsClient.calls).toEqual([['예산안', { display: 1, start: 1 }]]);
  });
});
