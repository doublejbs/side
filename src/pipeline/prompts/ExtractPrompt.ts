import { MediaLeaning } from '@/domain/MediaLeaning';
import { ARTICLE_INJECTION_GUARD, wrapArticles } from '@/pipeline/prompts/ArticleBoundary';
import { NEUTRALITY_PRINCIPLES } from '@/pipeline/prompts/NeutralityPrinciples';
import { formatPromptArticles, type PromptArticle } from '@/pipeline/prompts/PromptArticle';

/** 성향이 지정된 매체의 기사만 모은 묶음. 성향 미지정 매체는 넘기지 않는다. */
export interface LeaningArticleGroup {
  leaning: MediaLeaning;
  articles: PromptArticle[];
}

interface ExtractUserPromptInput {
  question: string;
  articles: PromptArticle[];
  leaningGroups: LeaningArticleGroup[];
}

const LEANING_LABEL: Record<MediaLeaning, string> = {
  [MediaLeaning.PROGRESSIVE]: '진보 성향 매체',
  [MediaLeaning.CENTRIST]: '중도 성향 매체',
  [MediaLeaning.CONSERVATIVE]: '보수 성향 매체',
};

const getLeaningLabel = (leaning: MediaLeaning): string => LEANING_LABEL[leaning];

/** 논점 추출(4.4장) 시스템 프롬프트. */
export const buildExtractSystemPrompt = (): string =>
  [
    '너는 정치 이슈의 찬성·반대 논점을 중립적으로 정리하는 편집자다.',
    '여러 매체의 기사 제목과 설명만 보고, 양쪽 주장을 같은 무게로 정리한다.',
    '',
    '편집 원칙',
    NEUTRALITY_PRINCIPLES,
    '',
    '입력 취급 규칙',
    ARTICLE_INJECTION_GUARD,
    '',
    '출력 규칙',
    '- claims: 찬성(AGREE) 3개, 반대(DISAGREE) 3개, 총 6개. 양쪽 제목과 설명은 같은 분량으로 쓴다.',
    '- 각 주장의 title 은 단정이 아닌 가능성의 표현으로 쓴다. description 은 2~3문장이다.',
    '- 각 주장에는 근거(evidences)를 2개 이상 붙인다.',
    '- 근거의 articleIndex 는 입력 기사 목록의 인덱스 번호다. 목록에 없는 번호를 쓰지 않는다.',
    '- 근거의 type 은 FACT(확인된 사실), RESEARCH(조사·통계), EXPERT(전문가 견해), CLAIM(이해관계자 주장) 중 하나다.',
    '- mediaPerspectives: 아래 성향별 기사 묶음에 실제로 기사가 있는 성향에 대해서만 작성한다.',
    '  frame 은 그 성향의 기사들이 자주 쓴 관점을 사실 그대로 요약하고, 매체를 평가하지 않는다.',
    '  keywords 는 반복 등장한 단어 3개, representativeArticleIndex 는 그 성향 묶음에 실린 기사의 인덱스 번호다.',
    '- commonCoverage: 성향과 무관하게 공통으로 다룬 내용 2~3개.',
    '- opinionGroups: 독자들이 나뉠 만한 의견 묶음 3개. label 은 그룹 A, 그룹 B, 그룹 C 로 쓴다.',
    '  share 는 퍼센트 추정치이며 합이 100을 넘지 않는다.',
    '  agreesWith·disagreesWith·mostDivided 는 claims 배열의 인덱스(0~5)로만 채운다.',
    '- 의견 그룹 설명에 정치 정체성 라벨을 쓰지 않고, 무엇을 중시하는지로 설명한다.',
  ].join('\n');

const formatLeaningSection = (group: LeaningArticleGroup): string =>
  [`${getLeaningLabel(group.leaning)} (${group.leaning}) 기사 ${group.articles.length}건`, formatPromptArticles(group.articles)].join(
    '\n',
  );

const formatLeaningSections = (groups: LeaningArticleGroup[]): string => {
  if (groups.length === 0) {
    return '성향이 지정된 매체의 기사가 없다. mediaPerspectives 는 빈 배열로 둔다.';
  }

  return groups.map(formatLeaningSection).join('\n\n');
};

/** 논점 추출 사용자 프롬프트. 기사 목록은 최신순으로 정렬해 넘긴다. */
export const buildExtractUserPrompt = ({
  question,
  articles,
  leaningGroups,
}: ExtractUserPromptInput): string =>
  [
    `이슈 질문: ${question}`,
    '',
    `기사 ${articles.length}건(최신순). 대괄호 안 숫자가 articleIndex 다.`,
    ARTICLE_INJECTION_GUARD,
    '',
    wrapArticles(
      [
        formatPromptArticles(articles),
        '',
        '성향별 기사 묶음 (관리자가 지정한 매체 성향만 포함한다)',
        '',
        formatLeaningSections(leaningGroups),
      ].join('\n'),
    ),
    '',
    '이 기사들만 근거로 삼아 찬성·반대 논점과 언론 관점을 정리해라.',
  ].join('\n');
