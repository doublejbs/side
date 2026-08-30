import type OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';

import { createOpenAiEmbeddingClient } from '@/pipeline/OpenAiEmbeddingClient';

describe('createOpenAiEmbeddingClient', () => {
  it('모델·입력을 그대로 넘기고 index 순으로 벡터를 돌려준다', async () => {
    const create = vi.fn(async () => ({
      data: [
        { index: 1, embedding: [0, 1], object: 'embedding' },
        { index: 0, embedding: [1, 0], object: 'embedding' },
      ],
    }));
    const client = createOpenAiEmbeddingClient({
      apiKey: 'key',
      model: 'text-embedding-3-small',
      openaiClient: { embeddings: { create } } as unknown as Pick<OpenAI, 'embeddings'>,
    });

    const vectors = await client.embed(['가', '나']);

    expect(vectors).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: ['가', '나'],
    });
  });

  it('빈 입력이면 호출하지 않는다', async () => {
    const create = vi.fn();
    const client = createOpenAiEmbeddingClient({
      apiKey: 'key',
      model: 'text-embedding-3-small',
      openaiClient: { embeddings: { create } } as unknown as Pick<OpenAI, 'embeddings'>,
    });

    expect(await client.embed([])).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });
});
