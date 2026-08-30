import { describe, expect, it } from 'vitest';

import { CLASSIFY_SCHEMA_NAME, classifySchema } from '@/pipeline/ClassifySchema';
import { createDryRunNewsClient, createDryRunTextClient } from '@/pipeline/DryRunClients';
import { EXTRACT_SCHEMA_NAME, extractSchema } from '@/pipeline/ExtractSchema';
import { SUMMARIZE_SCHEMA_NAME, summarizeSchema } from '@/pipeline/SummarizeSchema';
import { VERIFY_SCHEMA_NAME, verifySchema } from '@/pipeline/VerifySchema';

/**
 * dry-run 고정 응답이 실제 스키마를 통과하는지 지킨다.
 * 스키마를 조이고 자리표시자를 잊으면 `--dry-run` 이 조용히 깨진다.
 */
describe('createDryRunTextClient', () => {
  it('고정 요약 응답이 summarizeSchema 를 통과한다', async () => {
    const client = createDryRunTextClient();

    const result = await client.generateStructured({
      schema: summarizeSchema,
      schemaName: SUMMARIZE_SCHEMA_NAME,
      systemPrompt: '시스템',
      userPrompt: '사용자',
    });

    expect(result.question.endsWith('?')).toBe(true);
    expect(result.keyPoints).toHaveLength(4);
  });

  it('고정 분류 응답이 classifySchema 를 통과한다', async () => {
    const client = createDryRunTextClient();

    const result = await client.generateStructured({
      schema: classifySchema,
      schemaName: CLASSIFY_SCHEMA_NAME,
      systemPrompt: '시스템',
      userPrompt: '사용자',
    });

    expect(result.isPolicyDebate).toBe(true);
    expect(result.keySentences.length).toBeGreaterThanOrEqual(3);
  });

  it('고정 검증 응답이 verifySchema 를 통과한다', async () => {
    const client = createDryRunTextClient();

    const result = await client.generateStructured({
      schema: verifySchema,
      schemaName: VERIFY_SCHEMA_NAME,
      systemPrompt: '시스템',
      userPrompt: '사용자',
    });

    expect(result.verdicts).toHaveLength(1);
  });

  it('고정 논점 응답이 extractSchema 를 통과한다', async () => {
    const client = createDryRunTextClient();

    const result = await client.generateStructured({
      schema: extractSchema,
      schemaName: EXTRACT_SCHEMA_NAME,
      systemPrompt: '시스템',
      userPrompt: '사용자',
    });

    expect(result.claims).toHaveLength(6);
    expect(result.opinionGroups).toHaveLength(3);
  });

  it('같은 스키마를 여러 번 불러도 계속 같은 응답을 돌려준다', async () => {
    const client = createDryRunTextClient();
    const request = {
      schema: summarizeSchema,
      schemaName: SUMMARIZE_SCHEMA_NAME,
      systemPrompt: '시스템',
      userPrompt: '사용자',
    };

    const first = await client.generateStructured(request);
    const second = await client.generateStructured(request);

    expect(second).toEqual(first);
  });
});

describe('createDryRunNewsClient', () => {
  it('네트워크를 쓰지 않고 빈 결과를 돌려준다', async () => {
    const items = await createDryRunNewsClient().search('예산안', { display: 10, start: 1 });

    expect(items).toEqual([]);
  });
});
