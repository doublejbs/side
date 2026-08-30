import { describe, expect, it } from 'vitest';

import { decodeSlugParam } from '@/server/decodeRouteParam';

describe('decodeSlugParam', () => {
  it('퍼센트 인코딩된 한글 slug 를 되돌린다', () => {
    expect(
      decodeSlugParam('cptpp-%EA%B0%80%EC%9E%85%EC%9D%84-%EC%B6%94%EC%A7%84%ED%95%B4%EC%95%BC-%ED%95%A0%EA%B9%8C'),
    ).toBe('cptpp-가입을-추진해야-할까');
  });

  it('이미 디코드된 값은 그대로 둔다', () => {
    expect(decodeSlugParam('cptpp-가입을-추진해야-할까')).toBe('cptpp-가입을-추진해야-할까');
  });

  it('ASCII slug 는 그대로 둔다', () => {
    expect(decodeSlugParam('work-week-4-5')).toBe('work-week-4-5');
  });

  it('두 번 적용해도 결과가 같다(slug 에는 % 가 남지 않는다)', () => {
    const encoded = 'cptpp-%EA%B0%80%EC%9E%85';

    expect(decodeSlugParam(decodeSlugParam(encoded))).toBe(decodeSlugParam(encoded));
  });

  it('깨진 인코딩이면 원문을 그대로 돌려준다', () => {
    expect(decodeSlugParam('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('빈 문자열도 그대로 둔다', () => {
    expect(decodeSlugParam('')).toBe('');
  });
});
