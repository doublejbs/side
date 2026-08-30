import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createFakeTextClient } from '@/pipeline/FakeTextClient';

const schema = z.object({ value: z.string() });

describe('createFakeTextClient', () => {
  it('스키마 이름별 큐에서 순서대로 응답한다', async () => {
    const client = createFakeTextClient({ first: [{ value: 'a' }, { value: 'b' }] });

    await expect(client.generateStructured({ schema, schemaName: 'first', systemPrompt: 's', userPrompt: 'u' })).resolves.toEqual({ value: 'a' });
    await expect(client.generateStructured({ schema, schemaName: 'first', systemPrompt: 's', userPrompt: 'u' })).resolves.toEqual({ value: 'b' });
  });

  it('큐를 다 쓰면 마지막 응답을 다시 돌려준다', async () => {
    const client = createFakeTextClient({ first: [{ value: 'a' }] });

    await client.generateStructured({ schema, schemaName: 'first', systemPrompt: 's', userPrompt: 'u' });

    await expect(client.generateStructured({ schema, schemaName: 'first', systemPrompt: 's', userPrompt: 'u' })).resolves.toEqual({ value: 'a' });
  });

  it('요청을 순서대로 기록한다', async () => {
    const client = createFakeTextClient({ first: [{ value: 'a' }] });

    await client.generateStructured({ schema, schemaName: 'first', systemPrompt: '시스템', userPrompt: '사용자' });

    expect(client.requests).toHaveLength(1);
    expect(client.requests[0].systemPrompt).toBe('시스템');
  });

  it('등록되지 않은 스키마 이름은 예외를 던진다', async () => {
    const client = createFakeTextClient({});

    await expect(
      client.generateStructured({ schema, schemaName: 'missing', systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow();
  });
});
