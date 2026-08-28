import { describe, expect, it, vi } from 'vitest';

import { NaverNewsApiError } from '@/pipeline/NaverNewsApiError';
import { createNaverNewsClient } from '@/pipeline/NaverNewsClient';

const okResponse = (items: unknown[]): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ items }),
    text: async () => '',
  }) as unknown as Response;

const errorResponse = (status: number): Response =>
  ({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => 'error body',
  }) as unknown as Response;

const rawItem = {
  title: '<b>예산안</b> 처리',
  originallink: 'https://www.hani.co.kr/arti/1',
  link: 'https://n.news.naver.com/article/1',
  description: '설명',
  pubDate: 'Thu, 28 Aug 2026 10:15:00 +0900',
};

describe('createNaverNewsClient', () => {
  it('정상 응답의 items 를 파싱한다', async () => {
    const fetchFn = vi.fn(async () => okResponse([rawItem]));
    const client = createNaverNewsClient({
      clientId: 'id',
      clientSecret: 'secret',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const items = await client.search('예산안', { display: 100, start: 1 });

    expect(items).toEqual([rawItem]);
  });

  it('link 가 없는 항목은 버린다', async () => {
    const fetchFn = vi.fn(async () => okResponse([rawItem, { title: '제목만' }, null]));
    const client = createNaverNewsClient({
      clientId: 'id',
      clientSecret: 'secret',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const items = await client.search('예산안', { display: 100, start: 1 });

    expect(items).toHaveLength(1);
  });

  it('인증 헤더와 sort=date 쿼리를 보낸다', async () => {
    const fetchFn = vi.fn(async () => okResponse([]));
    const client = createNaverNewsClient({
      clientId: 'my-id',
      clientSecret: 'my-secret',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await client.search('국회 예산', { display: 50, start: 101 });

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://openapi.naver.com/v1/search/news.json');
    expect(parsed.searchParams.get('query')).toBe('국회 예산');
    expect(parsed.searchParams.get('display')).toBe('50');
    expect(parsed.searchParams.get('start')).toBe('101');
    expect(parsed.searchParams.get('sort')).toBe('date');
    expect(init.headers).toEqual({
      'X-Naver-Client-Id': 'my-id',
      'X-Naver-Client-Secret': 'my-secret',
    });
  });

  it('429 는 백오프 후 재시도하고 성공하면 결과를 돌려준다', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(okResponse([rawItem]));
    const sleepFn = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
    const client = createNaverNewsClient({
      clientId: 'id',
      clientSecret: 'secret',
      fetchFn: fetchFn as unknown as typeof fetch,
      sleepFn,
    });

    const items = await client.search('예산안', { display: 100, start: 1 });

    expect(items).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleepFn.mock.calls.map(([ms]) => ms)).toEqual([500, 1000]);
  });

  it('재시도 3회를 모두 실패하면 NaverNewsApiError 를 던진다', async () => {
    const fetchFn = vi.fn(async () => errorResponse(500));
    const sleepFn = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
    const client = createNaverNewsClient({
      clientId: 'id',
      clientSecret: 'secret',
      fetchFn: fetchFn as unknown as typeof fetch,
      sleepFn,
    });

    await expect(client.search('예산안', { display: 100, start: 1 })).rejects.toBeInstanceOf(
      NaverNewsApiError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(sleepFn.mock.calls.map(([ms]) => ms)).toEqual([500, 1000, 2000]);
  });

  it('429 가 아닌 4xx 는 재시도 없이 즉시 던진다', async () => {
    const fetchFn = vi.fn(async () => errorResponse(401));
    const sleepFn = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
    const client = createNaverNewsClient({
      clientId: 'id',
      clientSecret: 'secret',
      fetchFn: fetchFn as unknown as typeof fetch,
      sleepFn,
    });

    await expect(client.search('예산안', { display: 100, start: 1 })).rejects.toMatchObject({
      name: 'NaverNewsApiError',
      status: 401,
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });
});
