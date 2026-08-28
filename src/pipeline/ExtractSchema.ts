import { z } from 'zod';

import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';

/** 구조화 출력에서 모델에게 보여줄 스키마 이름. */
export const EXTRACT_SCHEMA_NAME = 'issue_claims';

/** 진영별 주장 수. 찬성과 반대는 항상 같은 수를 만든다(브리프 3장 Equal weight). */
export const CLAIMS_PER_SIDE = 3;

/** 찬성 3 + 반대 3. `opinionGroups` 가 참조하는 주장 인덱스의 상한이기도 하다. */
export const TOTAL_CLAIM_COUNT = CLAIMS_PER_SIDE * 2;

const OPINION_GROUP_COUNT = 3;

const nonEmptyText = z.string().trim().min(1);

/**
 * 입력 기사 배열 인덱스의 상한.
 * 프롬프트에 넣는 기사 수보다 넉넉하지만, 무한대는 아니게 못을 박아 둔다.
 */
export const MAX_ARTICLE_INDEX = 199;

/** 입력 기사 배열의 인덱스. LLM 이 URL·매체명을 지어내지 못하게 인덱스만 인용시킨다. */
const articleIndex = z.number().int().min(0).max(MAX_ARTICLE_INDEX);

/** `claims` 배열의 인덱스(0~5). */
const claimIndex = z.number().int().min(0).max(TOTAL_CLAIM_COUNT - 1);

const evidenceDraftSchema = z.object({
  articleIndex,
  type: z.enum(EvidenceType),
  summary: nonEmptyText,
});

const claimDraftSchema = z.object({
  side: z.enum(ClaimSide),
  title: nonEmptyText,
  description: nonEmptyText,
  evidences: z.array(evidenceDraftSchema).min(2),
});

const mediaPerspectiveDraftSchema = z.object({
  leaning: z.enum(MediaLeaning),
  frame: nonEmptyText,
  keywords: z.array(nonEmptyText).length(3),
  representativeArticleIndex: articleIndex,
});

const opinionGroupDraftSchema = z.object({
  label: nonEmptyText,
  share: z.number().min(0).max(100),
  description: nonEmptyText,
  agreesWith: z.array(claimIndex),
  disagreesWith: z.array(claimIndex),
  mostDivided: z.array(claimIndex),
});

const countBySide = (claims: { side: ClaimSide }[], side: ClaimSide): number =>
  claims.filter((claim) => claim.side === side).length;

/**
 * 논점 추출 단계의 구조화 출력 스키마.
 * 근거: `docs/PipelineSpec.md` 4.4장.
 */
export const extractSchema = z.object({
  claims: z
    .array(claimDraftSchema)
    .length(TOTAL_CLAIM_COUNT)
    .refine(
      (claims) =>
        countBySide(claims, ClaimSide.AGREE) === CLAIMS_PER_SIDE &&
        countBySide(claims, ClaimSide.DISAGREE) === CLAIMS_PER_SIDE,
      { message: '찬성과 반대 주장은 각각 3개여야 한다' },
    ),
  mediaPerspectives: z.array(mediaPerspectiveDraftSchema).max(3),
  commonCoverage: z.array(nonEmptyText).min(2).max(3),
  opinionGroups: z
    .array(opinionGroupDraftSchema)
    .length(OPINION_GROUP_COUNT)
    .refine(
      (groups) => groups.reduce((sum, group) => sum + group.share, 0) <= 100,
      { message: '의견 그룹 비율의 합은 100을 넘을 수 없다' },
    ),
});

export type ExtractResult = z.infer<typeof extractSchema>;
export type ClaimDraft = z.infer<typeof claimDraftSchema>;
export type EvidenceDraft = z.infer<typeof evidenceDraftSchema>;
export type MediaPerspectiveDraft = z.infer<typeof mediaPerspectiveDraftSchema>;
export type OpinionGroupDraft = z.infer<typeof opinionGroupDraftSchema>;
