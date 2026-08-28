import type { EmbeddingClient } from '@/pipeline/EmbeddingClient';

/** 실제 임베딩과 같은 차원을 쓴다(`text-embedding-3-small`). */
export const EMBEDDING_DIMENSION = 1536;

const FNV_OFFSET = 2166136261;

const FNV_PRIME = 16777619;

/** 단어 하나를 결정적인 정수 해시로 바꾼다(FNV-1a). */
const hashToken = (token: string): number => {
  let hash = FNV_OFFSET;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
};

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^0-9a-z가-힣]+/)
    .filter((token) => token.length > 0);

/** 단어를 버킷에 넣어 만든 단위 벡터. 같은 단어를 공유할수록 코사인 유사도가 높다. */
const toVector = (text: string): number[] => {
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);

  tokenize(text).forEach((token) => {
    const hash = hashToken(token);
    const bucket = hash % EMBEDDING_DIMENSION;
    const sign = hash % 2 === 0 ? 1 : -1;

    vector[bucket] += sign;
  });

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (norm === 0) {
    vector[0] = 1;

    return vector;
  }

  return vector.map((value) => value / norm);
};

/**
 * 외부 호출 없이 결정적인 벡터를 돌려주는 임베딩 구현.
 * CLI 의 `--dry-run` 이 쓴다(같은 입력이면 항상 같은 벡터).
 */
export const createFakeEmbeddingClient = (): EmbeddingClient => ({
  embed: async (texts: string[]): Promise<number[][]> => texts.map(toVector),
});
