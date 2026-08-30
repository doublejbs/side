import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { MessageRole } from '@/pipeline/MessageRole';
import {
  createOpenAiTextClient,
  type OpenAiResponsesClient,
  type ResponsesParseBody,
  type ResponsesParseResult,
} from '@/pipeline/OpenAiTextClient';
import { StructuredOutputError } from '@/pipeline/StructuredOutputError';

const schema = z.object({ answer: z.string() });

const createFakeOpenAi = (
  results: (ResponsesParseResult | Error)[],
): { client: OpenAiResponsesClient; bodies: ResponsesParseBody[] } => {
  const bodies: ResponsesParseBody[] = [];
  const queue = [...results];

  const parse = vi.fn(async (body: ResponsesParseBody): Promise<ResponsesParseResult> => {
    bodies.push(body);

    const next = queue.shift();

    if (next instanceof Error) {
      throw next;
    }

    return next ?? {};
  });

  return { client: { responses: { parse } }, bodies };
};

const request = {
  schema,
  schemaName: 'fake_answer',
  systemPrompt: '너는 중립적인 편집자다.',
  userPrompt: '기사를 요약해라.',
};

describe('createOpenAiTextClient', () => {
  it('구조화 출력을 스키마로 검증해 돌려준다', async () => {
    const { client, bodies } = createFakeOpenAi([{ output_parsed: { answer: '좋다' } }]);
    const textClient = createOpenAiTextClient({ apiKey: 'key', model: 'gpt-test', openaiClient: client });

    await expect(textClient.generateStructured(request)).resolves.toEqual({ answer: '좋다' });
    expect(bodies).toHaveLength(1);
    expect(bodies[0].model).toBe('gpt-test');
    expect(bodies[0].input).toEqual([
      { role: MessageRole.SYSTEM, content: '너는 중립적인 편집자다.' },
      { role: MessageRole.USER, content: '기사를 요약해라.' },
    ]);
  });

  it('output_parsed 가 없으면 output_text 를 JSON 으로 읽는다', async () => {
    const { client } = createFakeOpenAi([{ output_text: '{"answer":"텍스트"}' }]);
    const textClient = createOpenAiTextClient({ apiKey: 'key', model: 'gpt-test', openaiClient: client });

    await expect(textClient.generateStructured(request)).resolves.toEqual({ answer: '텍스트' });
  });

  it('스키마 검증에 실패하면 한 번 재시도한다', async () => {
    const { client, bodies } = createFakeOpenAi([
      { output_parsed: { wrong: true } },
      { output_parsed: { answer: '두 번째' } },
    ]);
    const textClient = createOpenAiTextClient({ apiKey: 'key', model: 'gpt-test', openaiClient: client });

    await expect(textClient.generateStructured(request)).resolves.toEqual({ answer: '두 번째' });
    expect(bodies).toHaveLength(2);
    expect(bodies[1].input[1].content).toContain('재시도');
  });

  it('재시도 프롬프트에 직전 실패 사유를 담는다', async () => {
    const stanceSchema = z.object({
      question: z.string().refine((value) => value.includes('해야 할까'), {
        message: '질문 형식 위반: 찬성/반대로 답할 수 있는 정책 질문이어야 한다',
      }),
    });
    const { client, bodies } = createFakeOpenAi([
      { output_parsed: { question: '금융노조 총파업 쟁점은?' } },
      { output_parsed: { question: '주 4.5일제를 도입해야 할까?' } },
    ]);
    const textClient = createOpenAiTextClient({ apiKey: 'key', model: 'gpt-test', openaiClient: client });

    await textClient.generateStructured({ ...request, schema: stanceSchema });

    expect(bodies[1].input[1].content).toContain('실패 사유 — question: 질문 형식 위반');
  });

  it('호출 자체가 실패해도 한 번 재시도한다', async () => {
    const { client, bodies } = createFakeOpenAi([new Error('429'), { output_parsed: { answer: '복구' } }]);
    const textClient = createOpenAiTextClient({ apiKey: 'key', model: 'gpt-test', openaiClient: client });

    await expect(textClient.generateStructured(request)).resolves.toEqual({ answer: '복구' });
    expect(bodies).toHaveLength(2);
  });

  it('두 번 모두 실패하면 StructuredOutputError 를 던진다', async () => {
    const { client, bodies } = createFakeOpenAi([{ output_parsed: { wrong: 1 } }, { output_parsed: { wrong: 2 } }]);
    const textClient = createOpenAiTextClient({ apiKey: 'key', model: 'gpt-test', openaiClient: client });

    await expect(textClient.generateStructured(request)).rejects.toBeInstanceOf(StructuredOutputError);
    expect(bodies).toHaveLength(2);
  });
});
