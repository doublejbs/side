import { z } from 'zod';

import { MediaLeaning } from '@/domain/MediaLeaning';

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
