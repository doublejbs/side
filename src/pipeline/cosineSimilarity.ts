/**
 * 두 임베딩 벡터의 코사인 유사도.
 * 길이가 다르면 비교가 성립하지 않으므로 "닮지 않았다"는 뜻의 0 을 돌려준다.
 * 임베딩 모델이 바뀌어 차원이 섞여도 배치 전체가 죽지 않게 하려는 선택이다.
 * 영벡터도 방향이 없으므로 0 으로 본다. 근거: docs/PipelineSpec.md 4.2.
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
