/**
 * `[0]`, `[1, 3]` 처럼 기사 인덱스를 가리키는 인용 표기.
 * 프롬프트에서 금지하고 있지만 모델이 넣는 경우가 있어 저장 전에 한 번 더 걷어낸다.
 */
const CITATION_PATTERN = /\s*\[\d+(?:,\s*\d+)*\]/g;

/** 두 칸 이상 벌어진 공백. */
const REPEATED_SPACE_PATTERN = /\s{2,}/g;

/**
 * 문장에서 기사 인덱스 인용 표기를 지우고 공백을 정리한다.
 * 근거 자체(`Evidence.articleIndex`)는 건드리지 않고, 독자에게 보이는 문장에만 쓴다.
 */
export const stripCitationMarkers = (value: string): string =>
  value.replace(CITATION_PATTERN, '').replace(REPEATED_SPACE_PATTERN, ' ').trim();
