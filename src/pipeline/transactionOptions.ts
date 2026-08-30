/**
 * 파이프라인 트랜잭션의 타임아웃 옵션.
 *
 * 문제: GitHub Actions 러너(미국)에서 서울 Supabase로 장거리 연결 시,
 * 트랜잭션 내 많은 INSERT(claim 6건 + evidence ~18건)가
 * Prisma 기본 타임아웃 5000ms를 초과해 P2028 오류 발생.
 *
 * 솔루션: 타임아웃을 60초, maxWait를 15초로 설정하여
 * 네트워크 지연에 충분한 시간 제공.
 */
export const PIPELINE_TRANSACTION_OPTIONS = {
  timeout: 60_000,
  maxWait: 15_000,
} as const;
