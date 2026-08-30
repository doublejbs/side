import { normalizeDomain } from '@/pipeline/publisherDirectory';
import type { PromptArticle } from '@/pipeline/prompts/PromptArticle';

/** 프롬프트를 만들 때 필요한 기사 정보. Prisma `Article` 행의 부분집합이다. */
export interface PipelineArticle {
  id: string;
  originalLink: string;
  title: string;
  description: string;
  publisher: string | null;
  publishedAt: Date;
}

/** 최신순으로 정렬해 최대 `maxArticles` 건만 남긴다. 인덱스는 이 배열의 위치가 된다. */
export const selectPromptArticles = <T extends PipelineArticle>(articles: T[], maxArticles: number): T[] =>
  [...articles]
    .sort((left, right) => {
      const gap = right.publishedAt.getTime() - left.publishedAt.getTime();

      return gap !== 0 ? gap : left.id.localeCompare(right.id);
    })
    .slice(0, maxArticles);

/** 매체명이 없으면 원문 링크의 도메인을 그대로 쓴다(코드가 매체를 창작하지 않는다). */
export const resolveArticleSource = (article: PipelineArticle): string =>
  article.publisher ?? normalizeDomain(article.originalLink);

export const toPromptArticle = (article: PipelineArticle, index: number): PromptArticle => ({
  index,
  publisher: resolveArticleSource(article),
  publishedAt: article.publishedAt,
  title: article.title,
  description: article.description,
});
