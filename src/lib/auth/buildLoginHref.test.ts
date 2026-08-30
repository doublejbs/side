import { describe, expect, it } from 'vitest';

import { buildLoginHref, sanitizeNextPath } from '@/lib/auth/buildLoginHref';

describe('sanitizeNextPath', () => {
  it('내부 경로는 그대로 쓴다', () => {
    expect(sanitizeNextPath('/issues/work-week-4-5#vote')).toBe('/issues/work-week-4-5#vote');
  });

  it('값이 없으면 홈으로 보낸다', () => {
    expect(sanitizeNextPath(null)).toBe('/');
    expect(sanitizeNextPath(undefined)).toBe('/');
    expect(sanitizeNextPath('')).toBe('/');
  });

  it('외부 URL 은 거부한다', () => {
    expect(sanitizeNextPath('https://evil.test/steal')).toBe('/');
    expect(sanitizeNextPath('//evil.test/steal')).toBe('/');
    expect(sanitizeNextPath('javascript:alert(1)')).toBe('/');
  });

  it('역슬래시로 시작하는 우회 경로도 거부한다', () => {
    expect(sanitizeNextPath('/\\evil.test')).toBe('/');
    expect(sanitizeNextPath('\\/evil.test')).toBe('/');
  });

  it('슬래시로 시작하지 않는 상대 경로는 거부한다', () => {
    expect(sanitizeNextPath('issues/abc')).toBe('/');
  });

  it('제어문자로 외부 origin 을 섞은 경로는 거부한다', () => {
    expect(sanitizeNextPath(decodeURIComponent('/%0A/evil.com'))).toBe('/');
    expect(sanitizeNextPath('/\n/evil.com')).toBe('/');
    expect(sanitizeNextPath('/\t/evil.com')).toBe('/');
    expect(sanitizeNextPath('/\r/evil.com')).toBe('/');
  });

  it('인코딩된 제어문자가 남아 있어도 외부 origin 으로 새지 않는다', () => {
    const sanitized = sanitizeNextPath('/%0A/evil.com');

    expect(sanitized.startsWith('/')).toBe(true);
    expect(sanitized.startsWith('//')).toBe(false);
    expect(new URL(sanitized, 'https://side.test').origin).toBe('https://side.test');
  });

  it('쿼리와 해시가 있는 내부 경로는 그대로 유지한다', () => {
    expect(sanitizeNextPath('/issues/a?b=1#vote')).toBe('/issues/a?b=1#vote');
  });
});

describe('buildLoginHref', () => {
  it('next 를 인코딩해 붙인다', () => {
    expect(buildLoginHref('/issues/work-week-4-5#vote')).toBe(
      '/login?next=%2Fissues%2Fwork-week-4-5%23vote',
    );
  });

  it('외부 URL 은 홈으로 정규화한다', () => {
    expect(buildLoginHref('https://evil.test')).toBe('/login?next=%2F');
  });
});
