/** Prisma `IssueStatus` 와 값이 같은 도메인 enum. 화면·저장 계층은 이 타입만 쓰고 Prisma enum 은 매핑한다. */
export enum IssueStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  /** classify 가 정책 논쟁이 아니라고 판단해 자동으로 제외한 이슈. 관리자가 복원할 수 있다. */
  AUTO_REJECTED = 'AUTO_REJECTED',
}
