import type { KeyPoint, MediaPerspective, OpinionGroup } from '@/domain/Issue';
import type { ClaimSide } from '@/domain/ClaimSide';
import type { EvidenceType } from '@/domain/EvidenceType';
import type { IssueStatus } from '@/domain/IssueStatus';
import type { MediaLeaning } from '@/domain/MediaLeaning';

/** 검수 목록의 한 행. */
export interface AdminIssueListItem {
  id: string;
  question: string;
  articleCount: number;
  claimCount: number;
  createdAt: Date;
  /** 반려되지 않은 이슈에 `reviewNote` 가 남아 있으면 파이프라인이 남긴 경고다. */
  hasWarning: boolean;
}

export interface AdminEvidence {
  id: string;
  type: EvidenceType;
  source: string;
  date: Date;
  summary: string;
  url: string;
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
  listQueries(): Promise<AdminSearchQuery[]>;
  createQuery(keyword: string): Promise<void>;
  setQueryActive(id: string, isActive: boolean): Promise<void>;
  listPublishers(): Promise<AdminPublisher[]>;
  upsertPublisher(input: AdminPublisherInput): Promise<void>;
  deletePublisher(id: string): Promise<void>;
  isSlugTaken(slug: string): Promise<boolean>;
}
