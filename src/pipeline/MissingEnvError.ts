/** 파이프라인 CLI 가 필수 환경 변수 없이 실행됐을 때. 무엇이 빠졌는지 모아서 알린다. */
export class MissingEnvError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(`필수 환경 변수가 없습니다: ${missingKeys.join(', ')}`);
    this.name = 'MissingEnvError';
    this.missingKeys = missingKeys;
  }
}
