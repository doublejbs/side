import { describe, expect, it } from 'vitest';

import { cosineSimilarity } from '@/pipeline/cosineSimilarity';
import { createFakeEmbeddingClient, EMBEDDING_DIMENSION } from '@/pipeline/FakeEmbeddingClient';

describe('createFakeEmbeddingClient', () => {
  it('입력 순서대로 1536차원 벡터를 돌려준다', async () => {
    const client = createFakeEmbeddingClient();
    const vectors = await client.embed(['첫 번째 문장', '두 번째 문장']);

    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(EMBEDDING_DIMENSION);
  });

  it('같은 입력이면 항상 같은 벡터를 돌려준다', async () => {
    const client = createFakeEmbeddingClient();
    const [first] = await client.embed(['주 4.5일제 논의']);
    const [second] = await client.embed(['주 4.5일제 논의']);

    expect(first).toEqual(second);
  });

  it('단어를 많이 공유할수록 코사인 유사도가 높다', async () => {
    const client = createFakeEmbeddingClient();
    const [base, similar, different] = await client.embed([
      '주 4.5일제 도입 논의가 이어진다',
      '주 4.5일제 도입 논의가 계속된다',
      '원전 확대 계획이 발표됐다',
    ]);

    expect(cosineSimilarity(base, similar)).toBeGreaterThan(cosineSimilarity(base, different));
  });

  it('빈 문자열도 길이가 1인 벡터를 만든다', async () => {
    const client = createFakeEmbeddingClient();
    const [vector] = await client.embed(['']);

    expect(vector).toHaveLength(EMBEDDING_DIMENSION);
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1);
  });
});
