import OpenAI from 'openai';

import type { EmbeddingClient } from '@/pipeline/EmbeddingClient';

/** 테스트에서 갈아끼울 수 있도록 실제로 쓰는 부분만 좁혀 둔다. */
type OpenAiEmbeddings = Pick<OpenAI, 'embeddings'>;

export interface OpenAiEmbeddingClientConfig {
  apiKey: string;
  model: string;
  /** 주입하면 그대로 쓴다(테스트용). 없으면 apiKey 로 새 클라이언트를 만든다. */
  openaiClient?: OpenAiEmbeddings;
}

/**
 * OpenAI 임베딩 클라이언트(`text-embedding-3-small` 기본).
 * 응답이 순서를 보장하지 않을 수 있어 `index` 로 정렬한다.
 */
export const createOpenAiEmbeddingClient = (
  config: OpenAiEmbeddingClientConfig,
): EmbeddingClient => {
  const client: OpenAiEmbeddings = config.openaiClient ?? new OpenAI({ apiKey: config.apiKey });

  const embed = async (texts: string[]): Promise<number[][]> => {
    if (texts.length === 0) {
      return [];
    }

    const response = await client.embeddings.create({
      model: config.model,
      input: texts,
    });

    return [...response.data]
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
  };

  return { embed };
};
