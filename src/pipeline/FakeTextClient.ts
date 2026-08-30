import { StructuredOutputError } from '@/pipeline/StructuredOutputError';
import type { StructuredRequest, TextClient } from '@/pipeline/TextClient';

/** 스키마 이름 → 응답 큐. 큐를 다 쓰면 마지막 응답을 계속 돌려준다. */
export type FakeResponseQueues = Record<string, unknown[]>;

export interface FakeTextClient extends TextClient {
  /** 호출 순서대로 쌓인 요청. 프롬프트 검증에 쓴다. */
  readonly requests: StructuredRequest<unknown>[];
}

/**
 * 고정 응답을 돌려주는 `TextClient`.
 * 테스트와 CLI 의 `--dry-run` 이 함께 쓴다(외부 호출 없이 파이프라인 전체를 돌린다).
 */
export const createFakeTextClient = (queues: FakeResponseQueues): FakeTextClient => {
  const remaining = new Map<string, unknown[]>(
    Object.entries(queues).map(([name, values]) => [name, [...values]]),
  );
  const lastValue = new Map<string, unknown>();
  const requests: StructuredRequest<unknown>[] = [];

  const takeValue = (schemaName: string): unknown => {
    const queue = remaining.get(schemaName) ?? [];

    if (queue.length > 0) {
      const value = queue.shift();

      lastValue.set(schemaName, value);

      return value;
    }

    if (lastValue.has(schemaName)) {
      return lastValue.get(schemaName);
    }

    throw new StructuredOutputError(schemaName, 0);
  };

  return {
    requests,
    generateStructured: async <T>(request: StructuredRequest<T>): Promise<T> => {
      requests.push(request as StructuredRequest<unknown>);

      return request.schema.parse(takeValue(request.schemaName));
    },
  };
};
