import { describe, expect, it } from 'vitest';

import { cosineSimilarity } from '@/pipeline/cosineSimilarity';

describe('cosineSimilarity', () => {
  it('같은 방향 벡터는 1 이다', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  it('직교 벡터는 0 이다', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('반대 방향 벡터는 -1 이다', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
  });

  it('영벡터는 0 이다', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('길이가 다르면 0 이다', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it('빈 벡터는 0 이다', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});
