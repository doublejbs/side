/**
 * 의견 그룹 라벨은 정치 정체성이 아니라 순서 라벨만 쓴다(브리프 3장).
 * 파이프라인 초안(`extractClaims`)과 검수 폼(`adminFormFields`)이 같은 목록을 본다.
 */
export const OPINION_GROUP_LABELS = ['그룹 A', '그룹 B', '그룹 C'];

/**
 * 슬롯 번호로만 정해지는 의견 그룹 id.
 * 파이프라인이 만드는 id 와 폼이 채우는 id 가 같은 형식이어야 편집이 이어진다.
 */
export const buildOpinionGroupId = (issueId: string, index: number): string =>
  `${issueId}-group-${index + 1}`;

/** 라벨 목록보다 그룹이 많아져도 순서 라벨을 잃지 않게 한다. */
export const getOpinionGroupLabel = (index: number): string =>
  OPINION_GROUP_LABELS[index] ?? `그룹 ${index + 1}`;
