import type { Claim, Issue } from '@/domain/Issue';

/** 근거 화면의 정적 경로 생성에 쓰는 (이슈 slug, 주장 id) 조합. */
export interface ClaimRouteParams {
  slug: string;
  claimId: string;
}

/**
 * 이슈 읽기 계층. 구현은 환경에 따라 두 가지다.
 * - `PrismaIssueRepository` — `DATABASE_URL` 이 있을 때
 * - `MockIssueRepository` — 목 데이터 폴백
 *
 * 조회 키는 모두 `slug`(URL 식별자)다.
 */
export interface IssueRepository {
  /** 발행된 이슈 목록. 최신 발행 순. */
  listPublishedIssues(): Promise<Issue[]>;
  getIssueBySlug(slug: string): Promise<Issue | null>;
  getClaimById(slug: string, claimId: string): Promise<Claim | null>;
  /** 정적 경로 생성용 slug 목록. */
  listSlugs(): Promise<string[]>;
  /** 정적 경로 생성용 (slug, claimId) 조합. 이슈를 하나씩 다시 읽지 않도록 한 번에 모은다. */
  listClaimParams(): Promise<ClaimRouteParams[]>;
}
