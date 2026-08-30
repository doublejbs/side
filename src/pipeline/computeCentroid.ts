import { meanVector } from '@/pipeline/meanVector';

/**
 * 임베딩 목록의 평균 벡터(이슈 centroid).
 * `meanVector` 와 달리 차원이 섞여도 예외를 던지지 않고 **첫 유효 벡터의 차원**만 남긴다.
 * 임베딩 모델을 바꾼 뒤에도 보정 배치가 이슈 하나 때문에 멈추지 않게 하려는 선택이다.
 * 쓸 수 있는 벡터가 하나도 없으면 빈 배열을 돌려준다(= centroid 를 그대로 둔다).
 * 근거: docs/PipelineTieringSpec.md 11.1.
 */
export const computeCentroid = (embeddings: number[][]): number[] => {
  const filled = embeddings.filter((embedding) => embedding.length > 0);
  const dimension = filled[0]?.length ?? 0;

  if (dimension === 0) {
    return [];
  }

  return meanVector(filled.filter((embedding) => embedding.length === dimension));
};
