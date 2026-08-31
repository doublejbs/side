import type { Prisma } from '@prisma/client';

/**
 * 도메인 값을 Prisma 의 Json 컬럼 입력으로 넘긴다.
 * `Prisma.InputJsonValue` 는 인덱스 시그니처가 있는 구조만 받아 주므로 인터페이스로 선언한
 * 도메인 타입(`IssueAxis[]` 등)을 그대로 넣을 수 없다. 저장 직전에 한 번만 명시적으로 캐스팅하고,
 * 값의 모양은 `IssueJsonSchemas` 의 zod 스키마가 읽을 때 검증한다.
 */
export const toPrismaJson = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;
