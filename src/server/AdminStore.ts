import type { KeyPoint, MediaPerspective, OpinionGroup } from '@/domain/Issue';
import type { ClaimSide } from '@/domain/ClaimSide';
import type { EvidenceSupport } from '@/domain/EvidenceSupport';
import type { EvidenceType } from '@/domain/EvidenceType';
import type { IssueClassification } from '@/domain/IssueClassification';
import type { IssueStatus } from '@/domain/IssueStatus';
import type { MediaLeaning } from '@/domain/MediaLeaning';

/**
 * 복원(관리자 승격)한 이슈에 부여하는 논쟁성 점수.
 * 다음 실행에서 임계값과 무관하게 요약 대상이 되도록 상한값을 준다.
 * 근거: `docs/PipelineTieringSpec.md` 5장.
 */
export const RESTORED_DEBATE_SCORE = 100;

/** 검수 목록의 한 행. */
export interface AdminIssueListItem {
  id: string;
  question: string;
  articleCount: number;
  claimCount: number;
  createdAt: Date;
  /** 반려되지 않은 이슈에 `reviewNote` 가 남아 있으면 파이프라인이 남긴 경고다. */
  hasWarning: boolean;
  /** classify 가 매긴 논쟁성 점수. 아직 분류되지 않았으면 null. */
  debateScore: number | null;
  /** classify 가 부여한 주제 태그. 아직 분류되지 않았으면 null. */
  topic: string | null;
  /** classify 가 같은 이슈일 수 있다고 표시했는지(`classification.duplicateOfIssueId`). */
  hasDuplicateWarning: boolean;
}

export interface AdminEvidence {
  id: string;
  type: EvidenceType;
  source: string;
  date: Date;
  summary: string;
  url: string;
  /** verify 가 판정한 주장 지지 여부. 아직 검증되지 않았으면 null. */
  support: EvidenceSupport | null;
  /** verify 가 남긴 한 줄 판정 근거. */
  verificationNote: string | null;
}

export interface AdminClaim {
  id: string;
  side: ClaimSide;
  order: number;
  title: string;
  description: string;
  evidences: AdminEvidence[];
}

export interface AdminArticle {
  id: string;
  title: string;
  publisher: string | null;
  originalLink: string;
  publishedAt: Date;
}

/** 검수 폼이 필요로 하는 이슈 전체. */
export interface AdminIssueDetail {
  id: string;
  status: IssueStatus;
  slug: string | null;
  question: string;
  tags: string[];
  summary: string[];
  keyPoints: KeyPoint[];
  commonCoverage: string[];
  mediaPerspectives: MediaPerspective[];
  opinionGroups: OpinionGroup[];
  reviewNote: string | null;
  /** classify 결과 전문. 아직 분류되지 않았으면 null. */
  classification: IssueClassification | null;
  debateScore: number | null;
  topic: string | null;
  /** 마지막으로 분류에 성공한 시각. */
  classifiedAt: Date | null;
  /** 마지막으로 근거 검증에 성공한 시각. */
  verifiedAt: Date | null;
  createdAt: Date;
  publishedAt: Date | null;
  claims: AdminClaim[];
  articles: AdminArticle[];
}

/** 검수 폼이 저장하는 이슈 필드. 넘기지 않은 필드는 그대로 둔다. */
export interface AdminIssuePatch {
  question?: string;
  tags?: string[];
  summary?: string[];
  keyPoints?: KeyPoint[];
  commonCoverage?: string[];
  mediaPerspectives?: MediaPerspective[];
  opinionGroups?: OpinionGroup[];
}

export interface AdminClaimPatch {
  title?: string;
  description?: string;
}

export interface AdminEvidencePatch {
  type: EvidenceType;
}

/** 트랜잭션 한 번에 저장할 주장 하나. */
export interface AdminClaimPatchEntry {
  id: string;
  patch: AdminClaimPatch;
}

export interface AdminSearchQuery {
  id: string;
  keyword: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AdminPublisher {
  id: string;
  domain: string;
  name: string;
  leaning: MediaLeaning | null;
}

export interface AdminPublisherInput {
  domain: string;
  name: string;
  leaning: MediaLeaning | null;
}

/**
 * 관리자 화면이 쓰는 유일한 데이터 접근 경로.
 * 서버 액션은 Prisma 를 직접 부르지 않고 이 인터페이스만 사용한다.
 */
export interface AdminStore {
  listIssues(status: IssueStatus): Promise<AdminIssueListItem[]>;
  getIssue(id: string): Promise<AdminIssueDetail | null>;
  updateIssue(id: string, patch: AdminIssuePatch): Promise<void>;
  updateClaim(claimId: string, patch: AdminClaimPatch): Promise<void>;
  /** 검수 폼 저장은 이슈와 주장이 함께 반영되거나 함께 실패해야 한다. */
  saveIssueWithClaims(
    id: string,
    patch: AdminIssuePatch,
    claimPatches: AdminClaimPatchEntry[],
  ): Promise<void>;
  updateEvidence(evidenceId: string, patch: AdminEvidencePatch): Promise<void>;
  deleteEvidence(evidenceId: string): Promise<void>;
  /** 근거가 어떤 이슈에 속하는지. 없으면 null. */
  getEvidenceIssueId(evidenceId: string): Promise<string | null>;
  publishIssue(id: string, slug: string): Promise<void>;
  rejectIssue(id: string, note: string): Promise<void>;
  /**
   * 자동 제외·반려된 이슈를 다시 검수 대상(DRAFT)으로 되돌린다.
   * 판단 근거가 남도록 `reviewNote` 와 `classifiedAt` 은 지우지 않는다.
   */
  restoreIssue(id: string): Promise<void>;
  listQueries(): Promise<AdminSearchQuery[]>;
  createQuery(keyword: string): Promise<void>;
  setQueryActive(id: string, isActive: boolean): Promise<void>;
  listPublishers(): Promise<AdminPublisher[]>;
  upsertPublisher(input: AdminPublisherInput): Promise<void>;
  deletePublisher(id: string): Promise<void>;
  isSlugTaken(slug: string): Promise<boolean>;
}
