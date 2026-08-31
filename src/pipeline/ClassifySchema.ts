import { z } from 'zod';

import { AxisDirection } from '@/domain/AxisDirection';
import { MAX_ISSUE_AXES } from '@/domain/IssueAxis';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

/** 구조화 출력에서 모델에게 보여줄 스키마 이름. */
export const CLASSIFY_SCHEMA_NAME = 'issue_classification';

/** 정책 논쟁성 점수의 범위. */
export const MIN_DEBATE_SCORE = 0;
export const MAX_DEBATE_SCORE = 100;

/** 인물·기관·정책명 상한. 관리자가 훑어보는 용도이므로 길게 받지 않는다. */
const MAX_ENTITY_COUNT = 8;

const MIN_KEY_SENTENCE_COUNT = 3;
const MAX_KEY_SENTENCE_COUNT = 5;

const MIN_KEY_CLAIM_COUNT = 3;
const MAX_KEY_CLAIM_COUNT = 6;

const nonEmptyText = z.string().trim().min(1);

/**
 * 이슈가 걸려 있는 관점 축 하나.
 * `agreeDirection` 은 "이 질문에 찬성하면 축의 어느 쪽인가" 다.
 */
const issueAxisSchema = z.object({
  axis: z.enum(PerspectiveAxis),
  agreeDirection: z.enum(AxisDirection),
});

const hasUniqueAxes = (axes: { axis: PerspectiveAxis }[]): boolean =>
  new Set(axes.map((item) => item.axis)).size === axes.length;

/**
 * 이슈 분류 단계의 구조화 출력 스키마.
 * `duplicateOfIssueId` 는 구조화 출력이 선택 필드를 허용하지 않으므로 `null` 을 받는다.
 * 실제로 존재하는 이슈 id 인지는 스키마가 아니라 `classifyIssues` 가 확인한다.
 * 근거: `docs/PipelineTieringSpec.md` 4.1장.
 */
export const classifySchema = z.object({
  isPolicyDebate: z.boolean(),
  debateScore: z.number().int().min(MIN_DEBATE_SCORE).max(MAX_DEBATE_SCORE),
  topic: nonEmptyText,
  reason: nonEmptyText,
  entities: z.array(nonEmptyText).max(MAX_ENTITY_COUNT),
  keySentences: z.array(nonEmptyText).min(MIN_KEY_SENTENCE_COUNT).max(MAX_KEY_SENTENCE_COUNT),
  keyClaims: z.array(nonEmptyText).min(MIN_KEY_CLAIM_COUNT).max(MAX_KEY_CLAIM_COUNT),
  axes: z
    .array(issueAxisSchema)
    .max(MAX_ISSUE_AXES)
    .refine(hasUniqueAxes, { message: '같은 축을 두 번 담을 수 없다.' }),
  duplicateOfIssueId: z.string().nullable(),
});

export type ClassifyResult = z.infer<typeof classifySchema>;
