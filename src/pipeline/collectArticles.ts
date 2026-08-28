import type { PrismaClient } from '@prisma/client';

import type { NaverNewsClient, NaverNewsItem } from '@/pipeline/NaverNewsClient';
import { parsePubDate } from '@/pipeline/parsePubDate';
import { normalizeDomain, resolvePublisherName } from '@/pipeline/publisherDirectory';
import { stripHtml } from '@/pipeline/stripHtml';

export interface CollectArticlesDeps {
  prisma: PrismaClient;
  newsClient: NaverNewsClient;
  /** 키워드당 조회 페이지 수 (기본 3) */
  pagesPerQuery?: number;
  /** 한 페이지 건수 (기본 100, API 최대치) */
  display?: number;
}

export interface CollectArticlesResult {
  /** 조회한 활성 키워드 수 */
  queries: number;
  /** API 로 받아온 기사 수 */
  fetched: number;
  /** 새로 저장한 기사 수 */
  inserted: number;
  /** 중복·발행일 파싱 실패로 건너뛴 기사 수 */
  skipped: number;
}

interface ArticleRow {
  naverLink: string;
  originalLink: string;
  title: string;
  description: string;
  publisher: string;
  publishedAt: Date;
}

const DEFAULT_PAGES_PER_QUERY = 3;

const DEFAULT_DISPLAY = 100;

/** 네이버 검색 API 의 `start` 상한 */
const MAX_START = 1000;

/** 네이버 검색 API 의 `display` 상한. 넘겨 보내면 400 이 떨어진다. */
const MAX_DISPLAY = 100;

/** `display` 를 API 가 받는 범위(1~100)로 자른다. */
const clampDisplay = (display: number): number =>
  Math.min(MAX_DISPLAY, Math.max(1, Math.floor(display)));

/**
 * 매체명은 관리자가 관리하는 `Publisher` 테이블을 먼저 보고,
 * 없으면 코드에 있는 초기 시드(`publisherDirectory`)로 채운다.
 * 시드에도 없으면 도메인 문자열이 그대로 쓰인다.
 */
const resolvePublisher = (item: NaverNewsItem, nameByDomain: Map<string, string>): string => {
  const source = item.originallink.length > 0 ? item.originallink : item.link;
  const domain = normalizeDomain(source);

  return nameByDomain.get(domain) ?? resolvePublisherName(domain);
};

/**
 * 활성 검색 키워드로 네이버 뉴스를 수집해 `Article` 에 저장한다.
 * `naverLink` 기준으로 중복을 무시하는 멱등 단계다. 근거: docs/PipelineSpec.md 4.1.
 */
export const collectArticles = async (deps: CollectArticlesDeps): Promise<CollectArticlesResult> => {
  const { prisma, newsClient } = deps;
  const pagesPerQuery = deps.pagesPerQuery ?? DEFAULT_PAGES_PER_QUERY;
  const display = clampDisplay(deps.display ?? DEFAULT_DISPLAY);

  const searchQueries = await prisma.searchQuery.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const publishers = await prisma.publisher.findMany();
  const nameByDomain = new Map(
    publishers.map((publisher) => [normalizeDomain(publisher.domain), publisher.name]),
  );

  let fetched = 0;
  let inserted = 0;
  let skipped = 0;

  for (const searchQuery of searchQueries) {
    const rowByLink = new Map<string, ArticleRow>();

    for (let page = 0; page < pagesPerQuery; page += 1) {
      const start = page * display + 1;

      if (start > MAX_START) {
        break;
      }

      const items = await newsClient.search(searchQuery.keyword, { display, start });

      fetched += items.length;

      items.forEach((item) => {
        const publishedAt = parsePubDate(item.pubDate);

        if (publishedAt === null) {
          skipped += 1;

          return;
        }

        if (rowByLink.has(item.link)) {
          skipped += 1;

          return;
        }

        rowByLink.set(item.link, {
          naverLink: item.link,
          originalLink: item.originallink.length > 0 ? item.originallink : item.link,
          title: stripHtml(item.title),
          description: stripHtml(item.description),
          publisher: resolvePublisher(item, nameByDomain),
          publishedAt,
        });
      });

      if (items.length < display) {
        break;
      }
    }

    if (rowByLink.size === 0) {
      continue;
    }

    const links = [...rowByLink.keys()];
    const existing = await prisma.article.findMany({
      where: { naverLink: { in: links } },
      select: { naverLink: true },
    });

    existing.forEach((article) => {
      if (rowByLink.delete(article.naverLink)) {
        skipped += 1;
      }
    });

    if (rowByLink.size === 0) {
      continue;
    }

    const created = await prisma.article.createMany({
      data: [...rowByLink.values()],
      skipDuplicates: true,
    });

    inserted += created.count;
    skipped += rowByLink.size - created.count;
  }

  return { queries: searchQueries.length, fetched, inserted, skipped };
};
