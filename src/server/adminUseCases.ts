import type { EvidenceType } from '@/domain/EvidenceType';
import type { MediaPerspective, OpinionGroup } from '@/domain/Issue';
import { IssueStatus } from '@/domain/IssueStatus';
import type { MediaLeaning } from '@/domain/MediaLeaning';
import { normalizeDomain } from '@/pipeline/publisherDirectory';
import { AdminActionError } from '@/server/AdminActionError';
import { AdminMessage } from '@/server/AdminMessage';
import type { AdminClaimPatchEntry, AdminStore } from '@/server/AdminStore';
import { isSafeHttpUrl } from '@/server/isSafeHttpUrl';
import { PUBLIC_PAGE_TARGETS, type PublicPageTarget } from '@/server/PublicPageTargets';
import { resolveUniqueSlug, slugify } from '@/server/slugify';

export interface KeyPointInput {
  id: string;
  title: string;
  question: string;
}

export interface MediaPerspectiveInput {
  leaning: MediaLeaning;
  articleCount: number;
  frame: string;
  /** 쉼표로 구분한 키워드. */
  keywords: string;
  representativeTitle: string;
  representativeSource: string;
  representativeUrl: string;
}

export interface OpinionGroupInput {
  id: string;
  label: string;
  share: number;
  description: string;
}

export interface ClaimInput {
  id: string;
  title: string;
  description: string;
}

export interface SaveIssueInput {
  issueId: string;
  question: string;
  /** 쉼표로 구분한 태그. */
  tags: string;
  /** 줄바꿈으로 구분한 요약 문장. */
  summary: string;
  keyPoints: KeyPointInput[];
  /** 줄바꿈으로 구분한 공통 내용. */
  commonCoverage: string;
  mediaPerspectives: MediaPerspectiveInput[];
  opinionGroups: OpinionGroupInput[];
  claims: ClaimInput[];
}

/**
 * 유스케이스가 프레임워크를 직접 부르지 않도록 주입받는 바깥 효과.
 * `next/cache` 를 여기서 import 하면 인메모리 저장소로 하는 테스트가 Next 런타임에 묶인다.
 */
export interface AdminSideEffects {
  /** 승인·반려가 성공한 뒤 공개 화면 캐시를 무효화한다. */
  revalidatePublicPages?: (targets: PublicPageTarget[]) => void;
}

export interface PublisherInput {
  domain: string;
  name: string;
  leaning: MediaLeaning | null;
}

/** 복원을 허용하는 상태. 검수 대상으로 되돌릴 수 있는 것은 제외된 이슈뿐이다. */
const RESTORABLE_STATUSES: IssueStatus[] = [IssueStatus.AUTO_REJECTED, IssueStatus.REJECTED];

/** 병합 대상이 될 수 없는 상태. 이미 걸러낸 이슈에 기사를 몰아넣지 않는다. */
const MERGE_BLOCKED_TARGET_STATUSES: IssueStatus[] = [
  IssueStatus.REJECTED,
  IssueStatus.AUTO_REJECTED,
];

const MIN_SHARE = 0;

const MAX_SHARE = 100;

/** 쉼표로 나누고 공백·빈 값을 버린다. */
export const parseTagList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/** 줄바꿈으로 나누고 공백·빈 줄을 버린다. */
export const parseLineList = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/** 화면에 링크로 나가는 주소는 http·https 만 허용한다. 빈 값은 검사하지 않는다. */
const assertSafeUrl = (value: string): void => {
  if (value.length > 0 && !isSafeHttpUrl(value)) {
    throw new AdminActionError(AdminMessage.ERROR_INVALID_URL);
  }
};

const clampShare = (share: number): number => {
  if (!Number.isFinite(share)) {
    return MIN_SHARE;
  }

  return Math.min(MAX_SHARE, Math.max(MIN_SHARE, Math.round(share)));
};

const toMediaPerspective = (input: MediaPerspectiveInput): MediaPerspective => ({
  leaning: input.leaning,
  articleCount: Number.isFinite(input.articleCount) ? input.articleCount : 0,
  frame: input.frame.trim(),
  keywords: parseTagList(input.keywords),
  representativeArticle: {
    title: input.representativeTitle.trim(),
    source: input.representativeSource.trim(),
    url: input.representativeUrl.trim(),
  },
});

/** 폼에서 편집하지 않는 관계 필드(agreesWith 등)는 저장된 값을 그대로 유지한다. */
const toOpinionGroup = (input: OpinionGroupInput, current?: OpinionGroup): OpinionGroup => ({
  id: input.id || current?.id || input.label,
  label: input.label,
  share: clampShare(input.share),
  description: input.description.trim(),
  agreesWith: current?.agreesWith ?? [],
  disagreesWith: current?.disagreesWith ?? [],
  mostDivided: current?.mostDivided ?? [],
});

const requireIssue = async (store: AdminStore, issueId: string) => {
  const issue = await store.getIssue(issueId);

  if (!issue) {
    throw new AdminActionError(AdminMessage.ERROR_NOT_FOUND);
  }

  return issue;
};

const requireReviewableIssue = async (store: AdminStore, issueId: string) => {
  const issue = await requireIssue(store, issueId);

  if (issue.status !== IssueStatus.REVIEW) {
    throw new AdminActionError(AdminMessage.ERROR_NOT_REVIEWABLE);
  }

  return issue;
};

/**
 * 승인 흐름을 시작하기 전에 상태만 먼저 확인한다.
 * 검수 대기가 아닌 이슈는 폼 내용을 저장하기도 전에 막아, 승인 실패인데 값만 바뀌는 일을 없앤다.
 */
export const assertReviewable = async (store: AdminStore, issueId: string): Promise<void> => {
  await requireReviewableIssue(store, issueId);
};

/**
 * 검수 폼 전체(이슈 필드 + 주장 6개)를 한 트랜잭션으로 저장한다.
 * 슬롯은 성향(언론 관점)과 id(의견 그룹)로 짝지어 빈 칸을 지운 뒤에도 어긋나지 않게 한다.
 */
export const saveIssue = async (store: AdminStore, input: SaveIssueInput): Promise<void> => {
  const issue = await requireIssue(store, input.issueId);
  const question = input.question.trim();

  if (!question) {
    throw new AdminActionError(AdminMessage.ERROR_EMPTY_QUESTION);
  }

  const mediaPerspectives = input.mediaPerspectives
    .map(toMediaPerspective)
    .filter(
      (perspective) =>
        perspective.frame.length > 0 || perspective.representativeArticle.title.length > 0,
    )
    // 성향은 슬롯당 하나뿐이어야 한다. 폼이 조작돼 같은 성향이 겹쳐 오면 첫 칸만 남긴다.
    .filter(
      (perspective, index, list) =>
        list.findIndex((other) => other.leaning === perspective.leaning) === index,
    );

  for (const perspective of mediaPerspectives) {
    assertSafeUrl(perspective.representativeArticle.url);
  }

  const currentGroups = new Map(issue.opinionGroups.map((group) => [group.id, group]));
  const claimPatches: AdminClaimPatchEntry[] = input.claims.map((claim) => ({
    id: claim.id,
    patch: { title: claim.title.trim(), description: claim.description.trim() },
  }));

  await store.saveIssueWithClaims(
    issue.id,
    {
      question,
      tags: parseTagList(input.tags),
      summary: parseLineList(input.summary),
      keyPoints: input.keyPoints
        .map((keyPoint, index) => ({
          id: keyPoint.id || `key-point-${index + 1}`,
          title: keyPoint.title.trim(),
          question: keyPoint.question.trim(),
        }))
        .filter((keyPoint) => keyPoint.title.length > 0),
      commonCoverage: parseLineList(input.commonCoverage),
      mediaPerspectives,
      opinionGroups: input.opinionGroups
        .map((group) => toOpinionGroup(group, currentGroups.get(group.id)))
        .filter((group) => group.description.length > 0 || group.share > 0),
    },
    claimPatches,
  );
};

/** 주장 카드 하나만 저장한다. */
export const saveClaim = async (store: AdminStore, input: ClaimInput): Promise<void> => {
  await store.updateClaim(input.id, {
    title: input.title.trim(),
    description: input.description.trim(),
  });
};

/** 폼에서 온 근거가 정말 그 이슈의 것인지 확인한다. 다른 이슈 근거는 손대지 못하게 막는다. */
const requireEvidenceOfIssue = async (
  store: AdminStore,
  issueId: string,
  evidenceId: string,
): Promise<void> => {
  const ownerIssueId = await store.getEvidenceIssueId(evidenceId);

  if (!ownerIssueId) {
    throw new AdminActionError(AdminMessage.ERROR_NOT_FOUND);
  }

  if (ownerIssueId !== issueId) {
    throw new AdminActionError(AdminMessage.ERROR_EVIDENCE_MISMATCH);
  }
};

/** 근거 타입 변경. 소속 이슈가 다르면 거부한다. */
export const updateEvidenceType = async (
  store: AdminStore,
  issueId: string,
  evidenceId: string,
  type: EvidenceType,
): Promise<void> => {
  await requireEvidenceOfIssue(store, issueId, evidenceId);

  await store.updateEvidence(evidenceId, { type });
};

/** 근거 삭제. 소속 이슈가 다르면 거부한다. */
export const deleteEvidence = async (
  store: AdminStore,
  issueId: string,
  evidenceId: string,
): Promise<void> => {
  await requireEvidenceOfIssue(store, issueId, evidenceId);

  await store.deleteEvidence(evidenceId);
};

/**
 * 승인. 검수 대기(REVIEW) 상태만 허용한다.
 * 이미 slug 가 있으면 유지하고, 없으면 질문에서 만들어 중복을 피한다.
 */
export const publishIssue = async (
  store: AdminStore,
  issueId: string,
  { revalidatePublicPages }: AdminSideEffects = {},
): Promise<string> => {
  const issue = await requireReviewableIssue(store, issueId);

  if (!issue.question.trim()) {
    throw new AdminActionError(AdminMessage.ERROR_EMPTY_QUESTION);
  }

  const slug =
    issue.slug ??
    (await resolveUniqueSlug(slugify(issue.question), (candidate) => store.isSlugTaken(candidate)));

  await store.publishIssue(issue.id, slug);

  // centroid 가 비어 있으면 cluster 단계가 이 이슈를 배정 대상으로 보지 않아,
  // 같은 주제 실뉴스가 붙지 못하고 별도 이슈가 생긴다. 근거: `docs/PipelineTieringSpec.md` 11.1.
  if (!(await store.hasCentroid(issue.id))) {
    await store.recomputeCentroid(issue.id);
  }

  revalidatePublicPages?.(PUBLIC_PAGE_TARGETS);

  return slug;
};

/**
 * 중복 이슈 병합. 기사만 대상 이슈로 옮기고 원본은 반려 처리한다.
 * 원본 주장·근거는 지우지 않고 원본에 남긴다. 근거: `docs/PipelineTieringSpec.md` 11.2.
 */
export const mergeIssue = async (
  store: AdminStore,
  sourceId: string,
  targetId: string,
): Promise<{ movedArticles: number }> => {
  const source = await requireIssue(store, sourceId);

  if (sourceId === targetId) {
    throw new AdminActionError(AdminMessage.ERROR_MERGE_SELF);
  }

  // 발행 이슈를 병합하면 이미 쌓인 사용자 투표가 갈 곳을 잃는다. 먼저 반려해야 한다.
  if (source.status === IssueStatus.PUBLISHED) {
    throw new AdminActionError(AdminMessage.ERROR_MERGE_SOURCE_PUBLISHED);
  }

  const target = await store.getIssue(targetId);

  if (!target) {
    throw new AdminActionError(AdminMessage.ERROR_MERGE_TARGET_NOT_FOUND);
  }

  if (MERGE_BLOCKED_TARGET_STATUSES.includes(target.status)) {
    throw new AdminActionError(AdminMessage.ERROR_MERGE_TARGET_REJECTED);
  }

  return store.mergeIssue(source.id, target.id);
};

/** 반려. 메모는 필수다. */
export const rejectIssue = async (
  store: AdminStore,
  issueId: string,
  note: string,
  { revalidatePublicPages }: AdminSideEffects = {},
): Promise<void> => {
  const trimmed = note.trim();

  if (!trimmed) {
    throw new AdminActionError(AdminMessage.ERROR_EMPTY_NOTE);
  }

  const issue = await requireIssue(store, issueId);

  await store.rejectIssue(issue.id, trimmed);

  revalidatePublicPages?.(PUBLIC_PAGE_TARGETS);
};

/**
 * 복원. 자동 제외(오탐)·반려된 이슈만 검수 대상(DRAFT)으로 되돌린다.
 * 근거: `docs/PipelineTieringSpec.md` 5장.
 */
export const restoreIssue = async (store: AdminStore, issueId: string): Promise<void> => {
  const issue = await requireIssue(store, issueId);

  if (!RESTORABLE_STATUSES.includes(issue.status)) {
    throw new AdminActionError(AdminMessage.ERROR_NOT_RESTORABLE);
  }

  await store.restoreIssue(issue.id);
};

/** 수집 키워드 추가. 같은 키워드가 있으면 다시 활성화한다. */
export const addSearchQuery = async (store: AdminStore, keyword: string): Promise<void> => {
  const trimmed = keyword.trim();

  if (!trimmed) {
    throw new AdminActionError(AdminMessage.ERROR_EMPTY_KEYWORD);
  }

  await store.createQuery(trimmed);
};

/**
 * 매체 저장. 도메인 정규화는 파이프라인과 같은 `normalizeDomain` 을 쓴다(규칙이 갈라지지 않도록).
 * URL 형태로 입력했다면 스킴이 http·https 인지 먼저 확인한다.
 */
export const savePublisher = async (store: AdminStore, input: PublisherInput): Promise<void> => {
  const raw = input.domain.trim();

  if (raw.includes('://')) {
    assertSafeUrl(raw);
  }

  const domain = normalizeDomain(raw);
  const name = input.name.trim();

  if (!domain || !name) {
    throw new AdminActionError(AdminMessage.ERROR_EMPTY_PUBLISHER);
  }

  await store.upsertPublisher({ domain, name, leaning: input.leaning });
};
