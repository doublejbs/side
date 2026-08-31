import { AxisDirection } from '@/domain/AxisDirection';
import { ALL_PERSPECTIVE_AXES, getAxisLabels } from '@/domain/perspectiveAxisLabels';
import { ARTICLE_INJECTION_GUARD, wrapArticles } from '@/pipeline/prompts/ArticleBoundary';
import { NEUTRALITY_PRINCIPLES } from '@/pipeline/prompts/NeutralityPrinciples';
import { formatPromptArticles, type PromptArticle } from '@/pipeline/prompts/PromptArticle';

/** 중복 판단에 참고하라고 넘기는 기존 이슈 한 건. */
export interface ExistingIssueSummary {
  id: string;
  question: string;
  /** 아직 분류되지 않은 이슈는 주제가 없다. */
  topic: string | null;
}

interface ClassifyUserPromptInput {
  question: string;
  articles: PromptArticle[];
  existingIssues: ExistingIssueSummary[];
}

/** "정책 논쟁" 의 정의. 점수를 매기는 기준이므로 프롬프트에 그대로 못 박는다. */
export const POLICY_DEBATE_DEFINITION =
  '정책 논쟁이란 정부·의회·지자체의 결정이나 제도 변경에 대해 사회적으로 찬성과 반대가 갈리는 사안이다.';

/** 정책 논쟁이 아닌 유형. 실호출에서 실제로 걸러내지 못했던 사례를 그대로 적는다. */
export const NON_DEBATE_EXAMPLES = [
  "- 예측형 보도: '~될까?', '~할 수 있을까?' 처럼 결과를 점치는 기사만 모인 이슈",
  '- 단일 사건 보도: 하나의 사건 경과만 전하고 제도·정책 쟁점이 없는 이슈',
  '- 사고·재난: 피해 상황과 수습 과정을 전하는 이슈',
  '- 인물 동정: 인사·발언·일정 등 개인의 동향을 전하는 이슈',
  '- 스포츠·연예: 경기 결과, 작품·출연진 소식',
].join('\n');

/**
 * 관점 축 5개의 정의. 축 코드와 좌우 방향 라벨을 그대로 보여줘야 모델이 방향을 뒤집지 않는다.
 * 근거: `docs/PerspectiveSpec.md` 1장.
 */
export const PERSPECTIVE_AXIS_DEFINITIONS = ALL_PERSPECTIVE_AXES.map((axis) => {
  const labels = getAxisLabels(axis);

  return `- ${axis}(${labels.name}): ${AxisDirection.LEFT}=${labels.leftLabel}, ${AxisDirection.RIGHT}=${labels.rightLabel}`;
}).join('\n');

/** 이슈 분류(4.1장) 시스템 프롬프트. */
export const buildClassifySystemPrompt = (): string =>
  [
    '너는 뉴스 묶음이 찬반이 갈리는 정책 논쟁인지 판별하는 분류기다.',
    '기사 제목과 설명만 보고 판정하고, 어느 쪽이 옳은지는 판단하지 않는다.',
    '',
    '판정 기준',
    POLICY_DEBATE_DEFINITION,
    '다음 유형은 정책 논쟁이 아니므로 isPolicyDebate 를 false 로 두고 debateScore 를 낮게 준다.',
    NON_DEBATE_EXAMPLES,
    '',
    '편집 원칙',
    NEUTRALITY_PRINCIPLES,
    '',
    '입력 취급 규칙',
    ARTICLE_INJECTION_GUARD,
    '',
    '출력 규칙',
    '- isPolicyDebate: 위 정의에 해당하면 true, 아니면 false.',
    '- debateScore: 0~100 정수. 찬반이 뚜렷하고 제도 변경이 걸려 있을수록 높다.',
    '  isPolicyDebate 가 false 이면 40 이하로 준다.',
    '- topic: 주제 태그 1개. 예: 노동, 에너지, 주거, 교육, 복지, 안전, 외교.',
    '- reason: 판정 근거 한 문장. 관리자가 그대로 읽는다.',
    '- entities: 기사에 등장한 인물·기관·정책명 최대 8개. 평가 없이 이름만 적는다.',
    '- keySentences: 쟁점의 요지를 담은 문장 3~5개. 기사 원문 요약이 아니라 무엇이 걸려 있는지를 쓴다.',
    '- keyClaims: 이 이슈에서 오간 주요 주장의 요지 3~6개. 찬반을 구분하지 않고 나열한다.',
    '- axes: 이 질문이 걸려 있는 관점 축 0~2개. 축은 아래 목록의 코드만 쓴다.',
    '  agreeDirection 은 "이 질문에 찬성하는 것이 그 축의 어느 방향인가" 다.',
    '  같은 축을 두 번 넣지 않는다. 해당하는 축이 없거나 방향에 확신이 없으면 빈 배열로 둔다.',
    PERSPECTIVE_AXIS_DEFINITIONS,
    '- duplicateOfIssueId: 아래 기존 이슈 목록에 같은 이슈가 있으면 그 id, 없으면 null.',
    '  목록에 없는 id 를 지어내지 않는다.',
  ].join('\n');

const formatExistingIssues = (issues: ExistingIssueSummary[]): string => {
  if (issues.length === 0) {
    return '비교할 기존 이슈가 없다. duplicateOfIssueId 는 null 로 둔다.';
  }

  return issues
    .map((issue) => `[${issue.id}] ${issue.topic ?? '주제 미정'} · ${issue.question}`)
    .join('\n');
};

/** 이슈 분류 사용자 프롬프트. 기사 목록은 최신순으로 정렬해 넘긴다. */
export const buildClassifyUserPrompt = ({
  question,
  articles,
  existingIssues,
}: ClassifyUserPromptInput): string =>
  [
    `현재 이슈 질문: ${question}`,
    '',
    `같은 이슈로 묶인 기사 ${articles.length}건(최신순).`,
    ARTICLE_INJECTION_GUARD,
    '',
    wrapArticles(formatPromptArticles(articles)),
    '',
    '기존 이슈 목록 (중복 판단용, 대괄호 안이 이슈 id 다)',
    formatExistingIssues(existingIssues),
    '',
    '이 기사들만 근거로 삼아 정책 논쟁성을 판정해라.',
  ].join('\n');
