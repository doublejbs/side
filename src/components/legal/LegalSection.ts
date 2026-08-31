/** 약관·방침 문서의 조항 하나. `LegalPageView` 가 이 구조 그대로 렌더한다. */
export interface LegalSection {
  /** 조항 제목. 예: `제1조 (목적)` */
  heading: string;
  /** 조항 본문. 문단마다 하나씩. */
  paragraphs: string[];
  /** 열거가 필요한 조항만 사용한다. 문단 아래에 목록으로 붙는다. */
  items?: string[];
}
