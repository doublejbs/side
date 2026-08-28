import type { ZodType } from 'zod';

/** 구조화 출력 1회 요청. 스키마·이름·프롬프트만 넘기고 모델·인증은 구현체가 갖는다. */
export interface StructuredRequest<T> {
  schema: ZodType<T>;
  /** 모델에게 보여줄 JSON 스키마 이름. */
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
}

/**
 * 텍스트 생성 모델 호출 경계.
 * 파이프라인은 이 인터페이스만 알고, 테스트와 `--dry-run` 은 가짜 구현으로 대체한다.
 */
export interface TextClient {
  generateStructured<T>(request: StructuredRequest<T>): Promise<T>;
}
