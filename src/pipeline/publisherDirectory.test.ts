import { describe, expect, it } from 'vitest';

import {
  PUBLISHER_DIRECTORY,
  normalizeDomain,
  resolvePublisherName,
} from '@/pipeline/publisherDirectory';

describe('normalizeDomain', () => {
  it('대문자를 소문자로 바꾼다', () => {
    expect(normalizeDomain('Chosun.COM')).toBe('chosun.com');
  });

  it('www. 접두사를 제거한다', () => {
    expect(normalizeDomain('www.hani.co.kr')).toBe('hani.co.kr');
  });

  it('앞뒤 공백과 마지막 점을 제거한다', () => {
    expect(normalizeDomain('  WWW.Yna.co.kr.  ')).toBe('yna.co.kr');
  });

  it('URL 을 넣으면 호스트만 남긴다', () => {
    expect(normalizeDomain('https://www.khan.co.kr/article/12345?a=1')).toBe('khan.co.kr');
  });
});

describe('resolvePublisherName', () => {
  it('등록된 도메인은 매체명을 반환한다', () => {
    expect(resolvePublisherName('www.hani.co.kr')).toBe('한겨레');
    expect(resolvePublisherName('https://www.chosun.com/politics/1')).toBe('조선일보');
  });

  it('등록되지 않은 도메인은 정규화한 도메인 문자열을 그대로 반환한다', () => {
    expect(resolvePublisherName('www.unknown-news.example')).toBe('unknown-news.example');
  });

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(resolvePublisherName('')).toBe('');
  });
});

describe('PUBLISHER_DIRECTORY', () => {
  it('주요 매체 15곳 이상을 담는다', () => {
    expect(PUBLISHER_DIRECTORY.length).toBeGreaterThanOrEqual(15);
  });

  it('도메인은 정규화된 형태이며 중복되지 않는다', () => {
    const domains = PUBLISHER_DIRECTORY.map((entry) => entry.domain);

    domains.forEach((domain) => {
      expect(domain).toBe(normalizeDomain(domain));
    });

    expect(new Set(domains).size).toBe(domains.length);
  });

  it('매체명이 비어 있는 항목은 없다', () => {
    PUBLISHER_DIRECTORY.forEach((entry) => {
      expect(entry.name.length).toBeGreaterThan(0);
    });
  });
});
