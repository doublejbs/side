import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { ZodError } from 'zod';

import { MessageRole } from '@/pipeline/MessageRole';
import { StructuredOutputError } from '@/pipeline/StructuredOutputError';
import type { StructuredRequest, TextClient } from '@/pipeline/TextClient';

/** OpenAI Responses API 중 실제로 쓰는 부분만 좁혀 선언한다(테스트에서 대체 가능하도록). */
export interface OpenAiResponsesClient {
  responses: {
    parse: (body: ResponsesParseBody) => Promise<ResponsesParseResult>;
  };
}

export interface ResponsesParseBody {
  model: string;
  input: { role: MessageRole; content: string }[];
  text: { format: unknown };
}

export interface ResponsesParseResult {
  output_parsed?: unknown;
  output_text?: string;
}

interface OpenAiTextClientOptions {
  apiKey: string;
  model: string;
  /** 테스트용 주입 지점. 없으면 실제 OpenAI 클라이언트를 만든다. */
  openaiClient?: OpenAiResponsesClient;
}

/** 형식이 틀렸을 때 한 번 더 시도하며 덧붙이는 안내. */
const RETRY_NOTICE =
  '\n\n[재시도] 직전 응답이 형식 검증에 실패했습니다. 설명 없이 스키마를 정확히 지킨 JSON 하나만 출력하세요.';

const MAX_ATTEMPTS = 2;

/** 재시도 프롬프트에 넣는 실패 사유의 최대 길이. 프롬프트가 길어지는 것을 막는다. */
const MAX_FAILURE_REASON_LENGTH = 500;

/**
 * 직전 시도가 왜 실패했는지 한 줄로 옮긴다.
 * zod 실패는 필드별 메시지를 그대로 넘겨 모델이 무엇을 고쳐야 하는지 알게 한다
 * (예: 질문이 설명·예측형이라 refine 에 걸린 경우).
 */
export const describeStructuredFailure = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join('.') || '(루트)'}: ${issue.message}`)
      .join(' / ');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '';
};

/** 실패 사유를 붙인 재시도 안내. 사유를 알 수 없으면 기본 안내만 쓴다. */
const buildRetryNotice = (error: unknown): string => {
  const reason = describeStructuredFailure(error).slice(0, MAX_FAILURE_REASON_LENGTH);

  return reason.length > 0 ? `${RETRY_NOTICE}\n실패 사유 — ${reason}` : RETRY_NOTICE;
};

const toParsedValue = (response: ResponsesParseResult): unknown => {
  if (response.output_parsed !== undefined && response.output_parsed !== null) {
    return response.output_parsed;
  }

  if (typeof response.output_text === 'string' && response.output_text.length > 0) {
    return JSON.parse(response.output_text);
  }

  throw new Error('모델 응답이 비어 있다');
};

/**
 * OpenAI Responses API 구조화 출력으로 `TextClient` 를 구현한다.
 * 근거: `docs/PipelineSpec.md` 4.3장.
 */
export const createOpenAiTextClient = ({
  apiKey,
  model,
  openaiClient,
}: OpenAiTextClientOptions): TextClient => {
  const client: OpenAiResponsesClient =
    openaiClient ?? (new OpenAI({ apiKey }) as unknown as OpenAiResponsesClient);

  const requestOnce = async <T>(request: StructuredRequest<T>, userPrompt: string): Promise<T> => {
    const response = await client.responses.parse({
      model,
      input: [
        { role: MessageRole.SYSTEM, content: request.systemPrompt },
        { role: MessageRole.USER, content: userPrompt },
      ],
      text: { format: zodTextFormat(request.schema, request.schemaName) },
    });

    return request.schema.parse(toParsedValue(response));
  };

  return {
    generateStructured: async <T>(request: StructuredRequest<T>): Promise<T> => {
      let lastError: unknown;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const userPrompt =
          attempt === 1
            ? request.userPrompt
            : `${request.userPrompt}${buildRetryNotice(lastError)}`;

        try {
          return await requestOnce(request, userPrompt);
        } catch (error) {
          lastError = error;
        }
      }

      throw new StructuredOutputError(request.schemaName, MAX_ATTEMPTS, lastError);
    },
  };
};
