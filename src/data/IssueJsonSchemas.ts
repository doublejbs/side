import { z } from 'zod';

import { AxisDirection } from '@/domain/AxisDirection';
import { MAX_ISSUE_AXES, type IssueAxis } from '@/domain/IssueAxis';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

/** Prisma 의 Json 컬럼을 도메인 타입으로 옮기기 전에 검증하는 스키마 모음. enum 컬럼은 `PrismaEnumMappers` 가 맡는다. */

export const keyPointsSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    question: z.string(),
  }),
);

export const mediaPerspectivesSchema = z.array(
  z.object({
    leaning: z.enum(MediaLeaning),
    articleCount: z.number(),
    frame: z.string(),
    keywords: z.array(z.string()),
    representativeArticle: z.object({
      title: z.string(),
      source: z.string(),
      url: z.string(),
    }),
  }),
);

/**
 * `Issue.axes` 를 읽고 쓸 때 검증한다. 같은 축을 두 번 지정하면 값이 상쇄되므로 거부한다.
 * classify 출력과 관리자 검수 폼이 같은 스키마를 쓴다.
 */
export const issueAxesSchema = z
  .array(
    z.object({
      axis: z.enum(PerspectiveAxis),
      agreeDirection: z.enum(AxisDirection),
    }),
  )
  .max(MAX_ISSUE_AXES)
  .refine((axes) => new Set(axes.map((entry) => entry.axis)).size === axes.length, {
    message: '같은 축을 두 번 지정할 수 없다',
  });

/**
 * `Issue.axes` Json 을 도메인 축 목록으로 옮긴다.
 * 값이 깨져 있어도 화면·계산이 멈추지 않도록 빈 축으로 떨어뜨린다.
 * 읽는 쪽(앱 매퍼·검수 폼·관점 계산)이 모두 이 함수를 쓴다.
 */
export const parseIssueAxes = (value: unknown): IssueAxis[] => {
  const parsed = issueAxesSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

/** classify 가 저장한 `Issue.classification` 을 읽을 때 검증한다. 근거: `docs/PipelineTieringSpec.md` 3장. */
export const issueClassificationSchema = z.object({
  isPolicyDebate: z.boolean(),
  debateScore: z.number(),
  topic: z.string(),
  reason: z.string(),
  entities: z.array(z.string()),
  keySentences: z.array(z.string()),
  keyClaims: z.array(z.string()),
  duplicateOfIssueId: z.string().optional(),
  axes: issueAxesSchema.optional(),
});

export const opinionGroupsSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    share: z.number(),
    description: z.string(),
    agreesWith: z.array(z.string()),
    disagreesWith: z.array(z.string()),
    mostDivided: z.array(z.string()),
  }),
);
