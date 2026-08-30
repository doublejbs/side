/**
 * 이슈 질문이 "찬성/반대로 답할 수 있는 정책 질문"인지 판정한다.
 *
 * 브리프 7·8·25장의 원칙: 이슈 제목은 "주 4.5일제를 도입해야 할까?"처럼 독자가 입장을 고를 수 있는
 * 질문이어야 한다. 실호출에서는 "금융노조 총파업 쟁점은?"·"울산 버스 파업 막을 수 있나?" 같은
 * 설명·예측형 질문이 나와 찬반 투표가 성립하지 않았다.
 * 근거: `docs/PipelineTieringSpec.md` 4.2장.
 */

/** 설명·예측형 질문임을 드러내는 금지 표현. 하나라도 있으면 입장 질문이 아니다. */
export const DESCRIPTIVE_QUESTION_MARKERS = [
  '무엇인가',
  '무엇이었나',
  '어떻게',
  '어디',
  '누가',
  '왜',
  '될까',
  '있나',
  '되나',
  '연결되나',
  '쟁점은',
] as const;

/** 찬성/반대 입장을 묻는 질문임을 드러내는 허용 표현. 하나는 반드시 있어야 한다. */
export const STANCE_QUESTION_MARKERS = [
  '해야 할까',
  '필요한가',
  '해야 하나',
  '옳은가',
  '허용해야',
  '확대해야',
  '강화해야',
  '도입해야',
  '연장해야',
  '폐지해야',
  '찬성',
] as const;

/** 물음표로 끝나고, 설명·예측형 표현이 없으며, 입장을 묻는 표현을 담고 있으면 참. */
export const isStanceQuestion = (question: string): boolean => {
  const trimmed = question.trim();

  if (!trimmed.endsWith('?')) {
    return false;
  }

  if (DESCRIPTIVE_QUESTION_MARKERS.some((marker) => trimmed.includes(marker))) {
    return false;
  }

  return STANCE_QUESTION_MARKERS.some((marker) => trimmed.includes(marker));
};
