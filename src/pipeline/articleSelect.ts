import type { Prisma } from '@prisma/client';

/**
 * 이슈에 붙은 기사를 읽을 때 파이프라인이 함께 쓰는 `select`.
 * 임베딩(1536차원 배열)은 프롬프트에도 근거에도 쓰지 않으므로 가져오지 않는다.
 * 근거: `docs/PipelineSpec.md` 4.3·4.4장.
 */
export const ARTICLE_SELECT = {
  id: true,
  originalLink: true,
  title: true,
  description: true,
  publisher: true,
  publishedAt: true,
} as const satisfies Prisma.ArticleSelect;

/** `ARTICLE_SELECT` 로 읽어 온 기사 행. 요약·논점 추출·재생성이 같은 형태를 쓴다. */
export type PipelineArticleRow = Prisma.ArticleGetPayload<{ select: typeof ARTICLE_SELECT }>;
