/** 환경 변수 값이 숫자가 아니거나 허용 범위를 벗어났을 때 던진다. */
export class InvalidEnvValueError extends Error {
  constructor(
    readonly key: string,
    readonly value: string,
    readonly expectation: string,
  ) {
    super(`환경 변수 ${key} 값이 올바르지 않습니다: "${value}" (${expectation})`);
    this.name = 'InvalidEnvValueError';
  }
}
