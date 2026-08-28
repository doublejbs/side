import { cosineSimilarity } from '@/pipeline/cosineSimilarity';

interface ClusterState {
  indexes: number[];
  centroid: number[];
}

/** 기존 centroid 에 벡터 하나를 이동 평균으로 더한다. `(c*n + v)/(n+1)`. */
const appendToCentroid = (centroid: number[], vector: number[], size: number): number[] =>
  centroid.map((value, index) => (value * size + vector[index]) / (size + 1));

/**
 * 순서대로 훑으면서 유사도 ≥ threshold 인 가장 가까운 그룹에 넣고, 없으면 새 그룹을 연다.
 * 차원이 다른 벡터는 비교 대상에서 제외해(유사도 0 취급) 예외 없이 별도 그룹이 된다.
 * 그룹의 대표 벡터는 소속 벡터들의 평균(centroid)으로 갱신하며 비교한다.
 * 반환값은 입력 인덱스의 그룹 배열. 근거: docs/PipelineSpec.md 4.2.
 */
export const greedyCluster = (vectors: number[][], threshold: number): number[][] => {
  const clusters: ClusterState[] = [];

  vectors.forEach((vector, index) => {
    let bestCluster: ClusterState | null = null;
    let bestSimilarity = Number.NEGATIVE_INFINITY;

    clusters.forEach((cluster) => {
      if (cluster.centroid.length !== vector.length) {
        return;
      }

      const similarity = cosineSimilarity(cluster.centroid, vector);

      if (similarity >= threshold && similarity > bestSimilarity) {
        bestCluster = cluster;
        bestSimilarity = similarity;
      }
    });

    if (bestCluster === null) {
      clusters.push({ indexes: [index], centroid: [...vector] });

      return;
    }

    const target = bestCluster as ClusterState;

    target.centroid = appendToCentroid(target.centroid, vector, target.indexes.length);
    target.indexes.push(index);
  });

  return clusters.map((cluster) => cluster.indexes);
};
