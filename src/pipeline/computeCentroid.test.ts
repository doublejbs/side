import { describe, expect, it } from 'vitest';

import { computeCentroid } from '@/pipeline/computeCentroid';

describe('computeCentroid', () => {
  it('벡터들의 평균을 돌려준다', () => {
    expect(computeCentroid([[1, 0], [0, 1]])).toEqual([0.5, 0.5]);
  });

  it('벡터가 하나면 그 벡터를 그대로 돌려준다', () => {
    expect(computeCentroid([[0.2, 0.4, 0.6]])).toEqual([0.2, 0.4, 0.6]);
  });

  it('빈 입력은 빈 배열이다', () => {
    expect(computeCentroid([])).toEqual([]);
  });

  it('빈 벡터만 있으면 빈 배열이다', () => {
    expect(computeCentroid([[], []])).toEqual([]);
  });

  it('첫 유효 벡터와 차원이 다른 항목은 평균에서 제외한다', () => {
    expect(computeCentroid([[1, 0], [0, 1, 1], [0, 1]])).toEqual([0.5, 0.5]);
  });

  it('빈 벡터는 차원 기준에서 빠지고 평균에도 들어가지 않는다', () => {
    expect(computeCentroid([[], [2, 2], [4, 4]])).toEqual([3, 3]);
  });
});
