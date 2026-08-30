import { ARTICLE_INJECTION_GUARD, wrapArticles } from '@/pipeline/prompts/ArticleBoundary';
import {
  formatClassificationDigest,
  type ClassificationDigest,
} from '@/pipeline/prompts/ClassificationDigest';
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
    '- question 은 반드시 찬성/반대로 답할 수 있는 정책·제도 질문이어야 한다.',
    "- 형식은 '~해야 할까?', '~가 필요한가?', '~를 허용해야 할까?' 처럼 입장을 묻는 형태로 쓴다.",
    "- 금지: '~쟁점은 무엇인가?', '~어떻게 되나?', '~막을 수 있나?', '~될까?'(예측), '~연결되나?' 같은 설명·예측형 질문.",
    '- 이슈가 노사 협상·사건 경과라면 그 안의 제도 쟁점(정년 65세 연장, 주 4.5일제, 보유세 강화 등)을 골라 질문으로 삼는다.',
    '- 좋은 예: "주 4.5일제를 도입해야 할까?" / "정년을 65세로 연장해야 할까?" / "원전 비중을 확대해야 할까?"',
    '- 나쁜 예: "금융노조 총파업 쟁점은?" / "울산 버스 파업 막을 수 있나?" / "CPTPP 가입을 어떻게 논의하나?"',
    '- question 은 찬성·반대 어느 한쪽 답도 암시하지 않는 중립적인 표현으로 쓴다.',
    '- tags: 이슈의 분야를 나타내는 짧은 명사 2개.',
    '- summary: 사실 중심 문장 3~5개. 각 문장은 기사에서 확인되는 내용만 담는다.',
    '- keyPoints: 의견이 갈리는 지점 4개. 각 항목은 짧은 제목(title)과 질문(question)으로 쓴다.',
  ].join('\n');

/** 이슈 요약 사용자 프롬프트. 기사 목록은 최신순으로 정렬해 넘긴다. */
export const buildSummarizeUserPrompt = (
  articles: PromptArticle[],
  digest?: ClassificationDigest,
): string =>
  [
    ...formatClassificationDigest(digest),
    `다음은 같은 이슈로 묶인 기사 ${articles.length}건이다(최신순).`,
    ARTICLE_INJECTION_GUARD,
    '',
    wrapArticles(formatPromptArticles(articles)),
    '',
    '이 기사들만 근거로 삼아 이슈를 정리해라.',
  ].join('\n');
