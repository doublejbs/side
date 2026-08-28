import { describe, expect, it } from 'vitest';

import { meanVector } from '@/pipeline/meanVector';

describe('meanVector', () => {
  it('벡터들의 평균을 낸다', () => {
    expect(meanVector([[0, 2], [2, 4], [4, 0]])).toEqual([2, 2]);
  });

  it('벡터가 하나면 그 벡터를 그대로 돌려준다', () => {
    expect(meanVector([[1, -1, 0.5]])).toEqual([1, -1, 0.5]);
  });

  it('빈 목록은 빈 벡터다', () => {
    expect(meanVector([])).toEqual([]);
  });

  it('길이가 다른 벡터가 섞이면 예외를 던진다', () => {
    expect(() => meanVector([[1, 2], [1]])).toThrow();
  });
});
