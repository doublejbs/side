import { describe, expect, it } from 'vitest';

import { classifySchema } from '@/pipeline/ClassifySchema';

const VALID = {
  isPolicyDebate: true,
  debateScore: 72,
  topic: '노동',
  reason: '노동시간 제도 변경에 찬반이 갈린다.',
  entities: ['국회', '고용노동부'],
  keySentences: ['적용 범위가 쟁점이다.', '중소기업 부담이 쟁점이다.', '임금 보전이 쟁점이다.'],
  keyClaims: ['삶의 질이 좋아진다', '비용이 늘어난다', '생산성이 관건이다'],
  duplicateOfIssueId: null,
};

describe('classifySchema', () => {
  it('올바른 분류 결과를 통과시킨다', () => {
    expect(classifySchema.parse(VALID).debateScore).toBe(72);
  });

  it('중복 이슈 id 를 문자열로 받는다', () => {
    expect(classifySchema.parse({ ...VALID, duplicateOfIssueId: 'issue-9' }).duplicateOfIssueId).toBe(
      'issue-9',
    );
  });

  it('점수가 0~100 을 벗어나면 막는다', () => {
    expect(() => classifySchema.parse({ ...VALID, debateScore: 101 })).toThrow();
    expect(() => classifySchema.parse({ ...VALID, debateScore: -1 })).toThrow();
  });

  it('점수는 정수여야 한다', () => {
    expect(() => classifySchema.parse({ ...VALID, debateScore: 72.5 })).toThrow();
  });

  it('인물·기관은 8개를 넘을 수 없다', () => {
    const entities = Array.from({ length: 9 }, (_, index) => `기관 ${index}`);

    expect(() => classifySchema.parse({ ...VALID, entities })).toThrow();
  });

  it('핵심 문장은 3~5개여야 한다', () => {
    expect(() => classifySchema.parse({ ...VALID, keySentences: ['하나', '둘'] })).toThrow();
    expect(() =>
      classifySchema.parse({ ...VALID, keySentences: ['1', '2', '3', '4', '5', '6'] }),
    ).toThrow();
  });

  it('핵심 주장은 3~6개여야 한다', () => {
    expect(() => classifySchema.parse({ ...VALID, keyClaims: ['하나', '둘'] })).toThrow();
    expect(() =>
      classifySchema.parse({ ...VALID, keyClaims: ['1', '2', '3', '4', '5', '6', '7'] }),
    ).toThrow();
  });

  it('빈 문자열은 막는다', () => {
    expect(() => classifySchema.parse({ ...VALID, topic: '   ' })).toThrow();
  });
});
