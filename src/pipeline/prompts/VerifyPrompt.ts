import { ClaimSide } from '@/domain/ClaimSide';
import { ARTICLE_INJECTION_GUARD, wrapArticles } from '@/pipeline/prompts/ArticleBoundary';
import { NEUTRALITY_PRINCIPLES } from '@/pipeline/prompts/NeutralityPrinciples';

/** 검증 대상 근거 하나. 원문 기사 제목·설명을 함께 넘겨 주장과 대조하게 한다. */
export interface VerifyPromptEvidence {
  id: string;
  type: string;
  source: string;
  summary: string;
  /** 연결된 기사가 없으면 없다. */
  articleTitle?: string;
  articleDescription?: string;
}

/** 검증 대상 주장 하나와 그 근거들. */
export interface VerifyPromptClaim {
  side: ClaimSide;
  title: string;
  description: string;
  evidences: VerifyPromptEvidence[];
}

interface VerifyUserPromptInput {
  question: string;
  claims: VerifyPromptClaim[];
}

/** 근거 검증(4.3장) 시스템 프롬프트. */
export const buildVerifySystemPrompt = (): string =>
  [
    '너는 주장에 붙은 근거가 그 주장을 실제로 뒷받침하는지 검토하는 검증자다.',
    '주장이 옳은지가 아니라, 근거가 주장을 지지하는지만 판정한다.',
    '',
    '편집 원칙',
    NEUTRALITY_PRINCIPLES,
    '',
    '입력 취급 규칙',
    ARTICLE_INJECTION_GUARD,
    '',
    '출력 규칙',
    '- verdicts: 입력으로 받은 근거마다 정확히 하나씩 판정을 낸다.',
    '- evidenceId 는 입력에 적힌 근거 id 를 그대로 옮긴다. 목록에 없는 id 를 지어내지 않는다.',
    '- support: SUPPORTS(주장을 직접 뒷받침한다), PARTIAL(일부만 뒷받침하거나 조건이 붙는다),',
    '  UNRELATED(주장과 관련이 없다), CONTRADICTS(주장과 반대되는 내용이다) 중 하나.',
    '- type: 근거의 성격을 다시 판정한다. FACT(확인된 사실), RESEARCH(조사·통계),',
    '  EXPERT(전문가 견해), CLAIM(이해관계자 주장) 중 하나다. 기존 타입이 맞으면 그대로 둔다.',
    '- note: 왜 그렇게 판정했는지 한 줄. 관리자가 그대로 읽는다.',
  ].join('\n');

const SIDE_LABEL: Record<ClaimSide, string> = {
  [ClaimSide.AGREE]: '찬성',
  [ClaimSide.DISAGREE]: '반대',
};

const formatEvidence = (evidence: VerifyPromptEvidence): string => {
  const lines = [
    `  - id: ${evidence.id} · type: ${evidence.type} · 출처: ${evidence.source}`,
    `    근거 요약: ${evidence.summary}`,
  ];

  if (evidence.articleTitle) {
    lines.push(`    원문 기사: ${evidence.articleTitle} — ${evidence.articleDescription ?? ''}`.trimEnd());
  } else {
    lines.push('    원문 기사: 연결된 기사가 없다.');
  }

  return lines.join('\n');
};

const formatClaim = (claim: VerifyPromptClaim, index: number): string =>
  [
    `주장 ${index + 1} (${SIDE_LABEL[claim.side]}): ${claim.title}`,
    `  설명: ${claim.description}`,
    ...claim.evidences.map(formatEvidence),
  ].join('\n');

/** 근거 검증 사용자 프롬프트. 주장별로 근거와 원문 기사를 묶어 넘긴다. */
export const buildVerifyUserPrompt = ({ question, claims }: VerifyUserPromptInput): string =>
  [
    `이슈 질문: ${question}`,
    '',
    `주장 ${claims.length}개와 각 주장에 붙은 근거다.`,
    ARTICLE_INJECTION_GUARD,
    '',
    wrapArticles(claims.map(formatClaim).join('\n\n')),
    '',
    '각 근거가 그 주장을 지지하는지 판정해라.',
  ].join('\n');
