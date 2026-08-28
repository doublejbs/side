/**
 * 벡터 목록의 평균 벡터(클러스터 centroid). 길이가 다른 벡터가 섞이면 예외를 던진다.
 */
export const meanVector = (vectors: number[][]): number[] => {
  if (vectors.length === 0) {
    return [];
  }

  const dimension = vectors[0].length;
  const sum = new Array<number>(dimension).fill(0);

  vectors.forEach((vector) => {
    if (vector.length !== dimension) {
      throw new Error(`벡터 길이가 다릅니다: ${vector.length} vs ${dimension}`);
    }

    for (let index = 0; index < dimension; index += 1) {
      sum[index] += vector[index];
    }
  });

  return sum.map((value) => value / vectors.length);
};
