import {
  keyPointsSchema,
  mediaPerspectivesSchema,
  opinionGroupsSchema,
} from '@/data/IssueJsonSchemas';
import {
  toDomainClaimSide,
  toDomainEvidenceSupport,
  toDomainEvidenceType,
} from '@/data/PrismaEnumMappers';
import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import type {
  Claim,
  Evidence,
  Issue,
  KeyPoint,
  MediaPerspective,
  OpinionGroup,
  VoteDistribution,
} from '@/domain/Issue';

/** Prisma `Evidence` 행에서 도메인 변환에 필요한 부분. */
export interface EvidenceRow {
  id: string;
  type: string;
  source: string;
  date: Date;
  summary: string;
  url: string;
  /** verify 판정. 아직 검증되지 않았으면 `null`. */
  support?: string | null;
}

/** Prisma `Claim` 행 + 근거. 설득됐어요 수는 관계 카운트로 받는다(피드백 행 전량 조회 금지). */
export interface ClaimRow {
  id: string;
  side: string;
  order: number;
  title: string;
  description: string;
  evidences: EvidenceRow[];
  _count: { feedbacks: number };
}

/** Prisma `Issue` 행 + 주장 · 기사 수. 분포·참여자 수·매체 수는 별도 집계로 넘긴다. */
export interface IssueRow {
  id: string;
  slug: string | null;
  question: string;
  tags: string[];
  summary: string[];
  keyPoints: unknown;
  commonCoverage: string[];
  mediaPerspectives: unknown;
  opinionGroups: unknown;
  claims: ClaimRow[];
  _count: { articles: number };
}

/** 행 하나만으로는 알 수 없어 별도 질의로 집계해 넘기는 값들. */
export interface IssueAggregates {
  distribution: VoteDistribution;
  participantCount: number;
  /** 이슈에 연결된 기사의 서로 다른 매체 수. */
  mediaOutletCount: number;
}

/** 클러스터링 대상 기간(14일)과 같은 라벨. 화면의 언론 관점 섹션 서브텍스트에 쓴다. */
const COVERAGE_PERIOD_LABEL = '최근 2주';

const KST_OFFSET_MINUTES = 9 * 60;

const SIDE_ORDER: Record<ClaimSide, number> = {
  [ClaimSide.AGREE]: 0,
  [ClaimSide.DISAGREE]: 1,
};

const padTwo = (value: number): string => String(value).padStart(2, '0');

/** 근거 날짜는 한국 시간 기준 `YYYY.MM.DD` 로 보여준다. */
const formatEvidenceDate = (date: Date): string => {
  const kst = new Date(date.getTime() + KST_OFFSET_MINUTES * 60 * 1000);

  return `${kst.getUTCFullYear()}.${padTwo(kst.getUTCMonth() + 1)}.${padTwo(kst.getUTCDate())}`;
};

/** Json 컬럼은 검증에 실패하면 화면을 깨뜨리지 않도록 빈 배열로 떨어뜨린다. */
const parseKeyPoints = (value: unknown): KeyPoint[] => {
  const parsed = keyPointsSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

const parseMediaPerspectives = (value: unknown): MediaPerspective[] => {
  const parsed = mediaPerspectivesSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

const parseOpinionGroups = (value: unknown): OpinionGroup[] => {
  const parsed = opinionGroupsSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

/** 앱에 내보내지 않는 판정. 관리자가 지우지 않았더라도 사용자 화면에서는 빼고 보여준다. */
const UNSUPPORTED_SUPPORTS: string[] = [EvidenceSupport.UNRELATED, EvidenceSupport.CONTRADICTS];

/**
 * 검증에서 무관·반박으로 판정된 근거는 앱 응답에서 제외한다.
 * 아직 검증되지 않은 근거(`support` 없음)는 그대로 내보낸다.
 * 근거: `docs/PipelineTieringSpec.md` 6장.
 */
const isExposableEvidence = (row: EvidenceRow): boolean =>
  !row.support || !UNSUPPORTED_SUPPORTS.includes(row.support);

const mapEvidenceRow = (row: EvidenceRow): Evidence => ({
  id: row.id,
  type: toDomainEvidenceType(row.type),
  source: row.source,
  date: formatEvidenceDate(row.date),
  summary: row.summary,
  url: row.url,
  ...(row.support ? { support: toDomainEvidenceSupport(row.support) } : {}),
});

const mapClaimRow = (row: ClaimRow): Claim => ({
  id: row.id,
  side: toDomainClaimSide(row.side),
  title: row.title,
  description: row.description,
  persuadedCount: row._count.feedbacks,
  evidences: row.evidences.filter(isExposableEvidence).map(mapEvidenceRow),
});

/** 찬성 주장을 먼저, 같은 진영 안에서는 `order` 순으로 보여준다. */
const compareClaims = (left: Claim, right: Claim, orderById: Map<string, number>): number => {
  const sideGap = SIDE_ORDER[left.side] - SIDE_ORDER[right.side];

  if (sideGap !== 0) {
    return sideGap;
  }

  return (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0);
};

/** Prisma 행을 화면이 쓰는 `Issue` 도메인 객체로 옮긴다. 순수 함수. */
export const mapIssueRow = (row: IssueRow, aggregates: IssueAggregates): Issue => {
  const orderById = new Map(row.claims.map((claim) => [claim.id, claim.order]));
  const claims = row.claims
    .map(mapClaimRow)
    .sort((left, right) => compareClaims(left, right, orderById));

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    question: row.question,
    tags: row.tags,
    participantCount: aggregates.participantCount,
    distribution: aggregates.distribution,
    summary: row.summary,
    sourceArticleCount: row._count.articles,
    mediaOutletCount: aggregates.mediaOutletCount,
    coveragePeriodLabel: COVERAGE_PERIOD_LABEL,
    keyPoints: parseKeyPoints(row.keyPoints),
    claims,
    mediaPerspectives: parseMediaPerspectives(row.mediaPerspectives),
    commonCoverage: row.commonCoverage,
    opinionGroups: parseOpinionGroups(row.opinionGroups),
  };
};
