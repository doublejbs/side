import { describe, expect, it } from 'vitest';

import { isSameOriginRequest } from '@/server/isSameOriginRequest';

const URL_UNDER_TEST = 'https://side.test/auth/signout';

const buildRequest = (headers: Record<string, string>): Request =>
  new Request(URL_UNDER_TEST, { method: 'POST', headers });

describe('isSameOriginRequest', () => {
  it('Origin 이 요청 URL 과 같으면 통과시킨다', () => {
    expect(isSameOriginRequest(buildRequest({ origin: 'https://side.test' }))).toBe(true);
  });

  it('Origin 이 다르면 막는다', () => {
    expect(isSameOriginRequest(buildRequest({ origin: 'https://evil.test' }))).toBe(false);
  });

  it('Origin 이 없고 Sec-Fetch-Site 가 same-origin 이면 통과시킨다', () => {
    expect(isSameOriginRequest(buildRequest({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
  });

  it('Origin 이 없고 Sec-Fetch-Site 가 cross-site 면 막는다', () => {
    expect(isSameOriginRequest(buildRequest({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });

  it('Origin 이 없고 Sec-Fetch-Site 가 none 이면 통과시킨다', () => {
    expect(isSameOriginRequest(buildRequest({ 'sec-fetch-site': 'none' }))).toBe(true);
  });

  it('두 헤더가 모두 없으면 막는다', () => {
    expect(isSameOriginRequest(buildRequest({}))).toBe(false);
  });
});
