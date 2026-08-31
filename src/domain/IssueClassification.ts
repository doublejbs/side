import type { IssueAxis } from '@/domain/IssueAxis';

/**
 * classify 단계(4.1)가 이슈에 붙이는 분류 결과. `Issue.classification` Json 컬럼에 저장한다.
 * 근거: `docs/PipelineTieringSpec.md` 3장.
 */
export interface IssueClassification {
  /** 찬반이 갈리는 정책·사회 이슈인가. 사건 예측·단순 사고·연예 등은 false 다. */
  isPolicyDebate: boolean;
  /** 정책 논쟁성 점수 0~100. */
  debateScore: number;
  /** 주제 태그 1개. 예: '노동', '에너지' */
  topic: string;
  /** 판정 근거 1문장. 관리자 화면에 그대로 보여준다. */
  reason: string;
  /** 인물·기관·정책명 (최대 8개). 관리자 참고용이며 앱에는 노출하지 않는다. */
  entities: string[];
  /** 쟁점 요지 문장 3~5개. 기사 원문 요약이 아니다. */
  keySentences: string[];
  /** 주요 주장 요지 3~6개. 찬반을 구분하지 않는다. */
  keyClaims: string[];
  /** 같은 이슈로 판단된 기존 이슈 id. 병합 제안일 뿐 자동으로 합치지 않는다. */
  duplicateOfIssueId?: string;
  /** classify가 제안한 축 — 저장은 Issue.axes가 원본 */
  axes?: IssueAxis[];
}
