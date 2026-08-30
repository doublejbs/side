import { describe, expect, it } from 'vitest';

import { summarizeSchema } from '@/pipeline/SummarizeSchema';

const VALID = {
  question: '주 4.5일제를 도입해야 할까?',
  tags: ['노동', '경제'],
  summary: [
    '국회에서 주 4.5일제 법안이 발의됐다.',
    '정부는 시범 사업을 검토하고 있다고 밝혔다.',
    '경영계와 노동계의 입장은 갈린다.',
  ],
  keyPoints: [
    { title: '생산성', question: '노동시간이 줄면 생산성은 어떻게 될까?' },
    { title: '임금', question: '임금은 그대로 유지될까?' },
    { title: '업종 차이', question: '모든 업종에 적용할 수 있을까?' },
    { title: '해외 사례', question: '다른 나라는 어떻게 했을까?' },
  ],
};

describe('summarizeSchema', () => {
  it('올바른 응답을 통과시킨다', () => {
    expect(summarizeSchema.parse(VALID)).toEqual(VALID);
  });

  it('물음표로 끝나지 않는 질문을 거절한다', () => {
    expect(summarizeSchema.safeParse({ ...VALID, question: '주 4.5일제 도입 논의' }).success).toBe(false);
  });

  it('설명·예측형 질문을 거절한다', () => {
    expect(summarizeSchema.safeParse({ ...VALID, question: '금융노조 총파업 쟁점은?' }).success).toBe(false);
    expect(summarizeSchema.safeParse({ ...VALID, question: '울산 버스 파업 막을 수 있나?' }).success).toBe(false);
    expect(summarizeSchema.safeParse({ ...VALID, question: '기아 노사 합의될까?' }).success).toBe(false);
  });

  it('질문 형식 위반 사유를 메시지에 남긴다', () => {
    const result = summarizeSchema.safeParse({ ...VALID, question: '금융노조 총파업 쟁점은?' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('질문 형식 위반');
  });

  it('30자를 넘는 질문을 거절한다', () => {
    const question = `${'주 4.5일제를 도입해야 하는지에 대한 사회적 논의는'.repeat(2)}?`;

    expect(summarizeSchema.safeParse({ ...VALID, question }).success).toBe(false);
  });

  it('태그가 2개가 아니면 거절한다', () => {
    expect(summarizeSchema.safeParse({ ...VALID, tags: ['노동'] }).success).toBe(false);
    expect(summarizeSchema.safeParse({ ...VALID, tags: ['노동', '경제', '복지'] }).success).toBe(false);
  });

  it('요약이 3문장 미만이거나 5문장을 넘으면 거절한다', () => {
    expect(summarizeSchema.safeParse({ ...VALID, summary: VALID.summary.slice(0, 2) }).success).toBe(false);
    expect(
      summarizeSchema.safeParse({ ...VALID, summary: [...VALID.summary, '네 번째.', '다섯 번째.', '여섯 번째.'] })
        .success,
    ).toBe(false);
  });

  it('핵심 쟁점이 4개가 아니면 거절한다', () => {
    expect(summarizeSchema.safeParse({ ...VALID, keyPoints: VALID.keyPoints.slice(0, 3) }).success).toBe(false);
  });

  it('빈 문자열을 거절한다', () => {
    expect(summarizeSchema.safeParse({ ...VALID, tags: ['노동', ''] }).success).toBe(false);
  });
});
