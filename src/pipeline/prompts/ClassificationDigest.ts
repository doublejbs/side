/**
 * classify(4.1장)가 미리 뽑아 둔 쟁점 요지. 요약·논점 추출 프롬프트에 함께 넘겨
 * 기사 제목·설명만으로 판단하는 부담을 줄인다.
 * 근거: `docs/PipelineTieringSpec.md` 4.2장.
 */
export interface ClassificationDigest {
  keySentences: string[];
  keyClaims: string[];
}

/** 사전 추출 요지 섹션. 분류 결과가 없으면 아무것도 넣지 않는다. */
export const formatClassificationDigest = (digest: ClassificationDigest | undefined): string[] => {
  if (!digest || (digest.keySentences.length === 0 && digest.keyClaims.length === 0)) {
    return [];
  }

  return [
    '사전 추출 요지 (분류 단계가 정리한 쟁점이다. 기사와 어긋나면 기사를 따른다.)',
    ...digest.keySentences.map((sentence) => `- 쟁점: ${sentence}`),
    ...digest.keyClaims.map((claim) => `- 주장: ${claim}`),
    '',
  ];
};
