import { describe, expect, it } from 'vitest';

import { greedyCluster } from '@/pipeline/greedyCluster';

describe('greedyCluster', () => {
  it('빈 입력은 빈 결과다', () => {
    expect(greedyCluster([], 0.8)).toEqual([]);
  });

  it('유사한 벡터끼리 한 그룹으로 묶는다', () => {
    const groups = greedyCluster(
      [
        [1, 0],
        [0.99, 0.1],
        [0, 1],
        [0.05, 1],
      ],
      0.9,
    );

    expect(groups).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('threshold 미만이면 각각 별도 그룹이 된다', () => {
    expect(greedyCluster([[1, 0], [0, 1]], 0.5)).toEqual([[0], [1]]);
  });

  it('가장 유사도가 높은 그룹에 배정한다', () => {
    const groups = greedyCluster(
      [
        [1, 0],
        [0, 1],
        [0.2, 1],
      ],
      0.1,
    );

    expect(groups).toEqual([[0], [1, 2]]);
  });

  it('차원이 다른 벡터는 예외 없이 별도 그룹이 된다', () => {
    expect(greedyCluster([[1, 0], [1, 0, 0], [1, 0]], 0.5)).toEqual([[0, 2], [1]]);
  });

  it('그룹 centroid 는 평균으로 갱신되며 비교된다', () => {
    // [1,0] 과 [0.8,0.6] 이 묶이면 centroid 는 [0.9,0.3] 이 된다.
    // [0.6,0.8] 은 첫 항목([1,0])과는 유사도 0.6 이라 threshold 미만이지만
    // centroid 와는 약 0.82 라서 같은 그룹에 들어간다.
    expect(greedyCluster([[1, 0], [0.8, 0.6], [0.6, 0.8]], 0.7)).toEqual([[0, 1, 2]]);
  });
});
