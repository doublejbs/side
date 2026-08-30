import { NaverNewsApiError } from '@/pipeline/NaverNewsApiError';

/**
 * 네이버 뉴스 검색 API 클라이언트.
 * 공식 문서: https://api.ncloud-docs.com/docs/naver-api-hub-search-news
 * (2026-07-31 이후 개발자센터 API는 차단되어 NAVER API HUB(NCP API Gateway)로 이관됨)
 */

/** 네이버 뉴스 검색 API 응답의 `items[]` 한 건. 원문 필드명을 그대로 쓴다. */
export interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface NaverNewsSearchOptions {
  /** 한 번에 가져올 건수 (API 최대 100) */
  display: number;
  /** 검색 시작 위치 (1부터) */
  start: number;
}

export interface NaverNewsClient {
  search(query: string, options: NaverNewsSearchOptions): Promise<NaverNewsItem[]>;
}

export interface NaverNewsClientConfig {
  /** NAVER API HUB(NCP API Gateway) 클라이언트 ID */
  clientId: string;
  /** NAVER API HUB(NCP API Gateway) 클라이언트 시크릿 */
  clientSecret: string;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
}

const SEARCH_URL = 'https://naverapihub.apigw.ntruss.com/search/v1/news';

/** 429/5xx 재시도 횟수. 500ms → 1000ms → 2000ms 로 백오프한다. */
const MAX_RETRIES = 3;

const BASE_BACKOFF_MS = 500;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryable = (status: number): boolean => status === 429 || status >= 500;

const toItem = (raw: unknown): NaverNewsItem | null => {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const read = (key: string): string => (typeof record[key] === 'string' ? (record[key] as string) : '');

  const link = read('link');

  if (link.length === 0) {
    return null;
  }

  return {
    title: read('title'),
    originallink: read('originallink'),
    link,
    description: read('description'),
    pubDate: read('pubDate'),
  };
};

/**
 * 네이버 뉴스 검색 API 클라이언트. `sort=date` 로 최신순 조회한다.
 * 근거: docs/PipelineSpec.md 4.1.
 */
export const createNaverNewsClient = (config: NaverNewsClientConfig): NaverNewsClient => {
  const fetchFn = config.fetchFn ?? fetch;
  const sleepFn = config.sleepFn ?? defaultSleep;

  const requestOnce = async (query: string, options: NaverNewsSearchOptions): Promise<Response> => {
    const url = new URL(SEARCH_URL);

    url.searchParams.set('query', query);
    url.searchParams.set('display', String(options.display));
    url.searchParams.set('start', String(options.start));
    url.searchParams.set('sort', 'date');
    url.searchParams.set('format', 'json');

    return fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': config.clientId,
        'X-NCP-APIGW-API-KEY': config.clientSecret,
      },
    });
  };

  const search = async (query: string, options: NaverNewsSearchOptions): Promise<NaverNewsItem[]> => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const response = await requestOnce(query, options);

      if (response.ok) {
        const payload = (await response.json()) as { items?: unknown };
        const items = Array.isArray(payload.items) ? payload.items : [];

        return items
          .map(toItem)
          .filter((item): item is NaverNewsItem => item !== null);
      }

      const body = await response.text().catch(() => '');

      if (!isRetryable(response.status) || attempt === MAX_RETRIES) {
        throw new NaverNewsApiError(response.status, body);
      }

      await sleepFn(BASE_BACKOFF_MS * 2 ** attempt);
    }

    // 위 루프에서 항상 반환하거나 throw 한다.
    throw new NaverNewsApiError(0, '네이버 뉴스 API 응답을 받지 못했습니다.');
  };

  return { search };
};
