import { describe, expect, it } from 'vitest';

import { isStanceQuestion } from '@/pipeline/isStanceQuestion';

/**
 * 실호출 첫 결과에서 나온 설명·예측형 질문들(앞 4개)과 같은 유형의 질문들.
 * 모두 찬성/반대 투표가 성립하지 않으므로 거절해야 한다.
 */
const DESCRIPTIVE_QUESTIONS = [
  '울산 버스 파업 막을 수 있나?',
  'CPTPP 가입을 어떻게 논의하나?',
  '금융노조 총파업 쟁점은?',
  '정년 연장과 당원주권은 어떻게 연결되나?',
  '현대차 임단협은 어떻게 되나?',
  '기아 노사 합의될까?',
  '이번 총파업의 쟁점은 무엇인가?',
  '누가 협상 테이블에 앉나?',
  '왜 교섭이 결렬됐나?',
  '예산 심사는 어디까지 왔나?',
];

/** 목 데이터 5개 이슈의 질문. 모두 입장을 묻는 형태다. */
const STANCE_QUESTIONS = [
  '주 4.5일제를 도입해야 할까?',
  'AI 규제를 강화해야 할까?',
  '부동산 보유세를 강화해야 할까?',
  '원전 비중을 확대해야 할까?',
  '정년을 65세로 연장해야 할까?',
];

describe('isStanceQuestion', () => {
  it.each(DESCRIPTIVE_QUESTIONS)('설명·예측형 질문을 거절한다: %s', (question) => {
    expect(isStanceQuestion(question)).toBe(false);
  });

  it.each(STANCE_QUESTIONS)('찬반 입장을 묻는 질문을 통과시킨다: %s', (question) => {
    expect(isStanceQuestion(question)).toBe(true);
  });

  it('물음표로 끝나지 않으면 거절한다', () => {
    expect(isStanceQuestion('주 4.5일제를 도입해야 할까')).toBe(false);
  });

  it('허용 표현이 없으면 거절한다', () => {
    expect(isStanceQuestion('주 4.5일제 도입의 조건은?')).toBe(false);
  });

  it('허용 표현이 있어도 설명·예측형 표현이 섞이면 거절한다', () => {
    expect(isStanceQuestion('정년을 연장하면 청년 고용은 어떻게 될까?')).toBe(false);
  });

  it('앞뒤 공백은 무시한다', () => {
    expect(isStanceQuestion('  원전 비중을 확대해야 할까?  ')).toBe(true);
  });
});
