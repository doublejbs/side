import { ARTICLE_INJECTION_GUARD, wrapArticles } from '@/pipeline/prompts/ArticleBoundary';
import { NEUTRALITY_PRINCIPLES } from '@/pipeline/prompts/NeutralityPrinciples';
import { formatPromptArticles, type PromptArticle } from '@/pipeline/prompts/PromptArticle';

/** 이슈 요약(4.3장) 시스템 프롬프트. */
export const buildSummarizeSystemPrompt = (): string =>
  [
    '너는 정치 이슈를 중립적으로 정리하는 편집자다.',
    '여러 매체의 기사 제목과 설명만 보고, 독자가 이슈를 30초 안에 이해하도록 정리한다.',
    '',
    '편집 원칙',
    NEUTRALITY_PRINCIPLES,
    '',
    '입력 취급 규칙',
    ARTICLE_INJECTION_GUARD,
    '',
    '출력 규칙',
    '- question: 이슈를 하나의 질문으로 요약한다. 물음표로 끝나고 30자를 넘지 않는다.',
    '- question 은 어느 한쪽 답을 암시하지 않는 열린 질문이어야 한다.',
    '- tags: 이슈의 분야를 나타내는 짧은 명사 2개.',
    '- summary: 사실 중심 문장 3~5개. 각 문장은 기사에서 확인되는 내용만 담는다.',
    '- keyPoints: 의견이 갈리는 지점 4개. 각 항목은 짧은 제목(title)과 질문(question)으로 쓴다.',
  ].join('\n');

/** 이슈 요약 사용자 프롬프트. 기사 목록은 최신순으로 정렬해 넘긴다. */
export const buildSummarizeUserPrompt = (articles: PromptArticle[]): string =>
  [
    `다음은 같은 이슈로 묶인 기사 ${articles.length}건이다(최신순).`,
    ARTICLE_INJECTION_GUARD,
    '',
    wrapArticles(formatPromptArticles(articles)),
    '',
    '이 기사들만 근거로 삼아 이슈를 정리해라.',
  ].join('\n');
