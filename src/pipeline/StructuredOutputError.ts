/** 재시도까지 했는데도 모델 응답이 스키마를 만족하지 못했을 때 던진다. */
export class StructuredOutputError extends Error {
  constructor(
    readonly schemaName: string,
    readonly attempts: number,
    readonly cause?: unknown,
  ) {
    super(`구조화 출력 검증 실패: ${schemaName} (${attempts}회 시도)`);
    this.name = 'StructuredOutputError';
  }
}
