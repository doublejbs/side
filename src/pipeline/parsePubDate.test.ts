import { describe, expect, it } from 'vitest';

import { parsePubDate } from '@/pipeline/parsePubDate';

describe('parsePubDate', () => {
  it('RFC 2822 문자열을 Date 로 바꾼다', () => {
    const parsed = parsePubDate('Thu, 28 Aug 2026 10:15:00 +0900');

    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe('2026-08-28T01:15:00.000Z');
  });

  it('앞뒤 공백을 무시한다', () => {
    expect(parsePubDate('  Thu, 28 Aug 2026 10:15:00 +0900  ')?.toISOString()).toBe(
      '2026-08-28T01:15:00.000Z',
    );
  });

  it('다른 오프셋도 처리한다', () => {
    expect(parsePubDate('Fri, 01 Jan 2027 00:00:00 +0000')?.toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });

  it('잘못된 값은 null 이다', () => {
    expect(parsePubDate('어제')).toBeNull();
    expect(parsePubDate('')).toBeNull();
    expect(parsePubDate('   ')).toBeNull();
  });
});
