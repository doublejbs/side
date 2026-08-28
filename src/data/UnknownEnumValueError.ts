/** Prisma enum 값이 도메인 enum 에 없을 때 던진다. 스키마와 도메인이 어긋난 것을 조용히 넘기지 않는다. */
export class UnknownEnumValueError extends Error {
  readonly enumName: string;

  readonly value: string;

  constructor(enumName: string, value: string) {
    super(`알 수 없는 ${enumName} 값입니다: ${value}`);

    this.name = 'UnknownEnumValueError';
    this.enumName = enumName;
    this.value = value;
  }
}
