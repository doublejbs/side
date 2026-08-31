import { describe, expect, it } from 'vitest';

import { issueAxesSchema, issueClassificationSchema } from '@/data/IssueJsonSchemas';
import { AxisDirection } from '@/domain/AxisDirection';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

const VALID = {
  isPolicyDebate: true,
  debateScore: 82,
  topic: '노동',
  reason: '노동시간 제도 변경에 찬반이 갈린다.',
  entities: ['국회'],
  keySentences: ['적용 범위가 쟁점이다.', '부담이 쟁점이다.', '보전이 쟁점이다.'],
  keyClaims: ['찬성 요지', '반대 요지', '중립 요지'],
};

describe('issueClassificationSchema', () => {
  it('저장된 분류 결과를 읽어 들인다', () => {
    expect(issueClassificationSchema.parse(VALID).topic).toBe('노동');
  });

  it('중복 이슈 id 는 없어도 된다', () => {
    expect(issueClassificationSchema.safeParse(VALID).success).toBe(true);
    expect(
      issueClassificationSchema.parse({ ...VALID, duplicateOfIssueId: 'issue-2' }).duplicateOfIssueId,
    ).toBe('issue-2');
  });

  it('필드가 빠졌거나 타입이 어긋나면 실패한다', () => {
    expect(issueClassificationSchema.safeParse({ ...VALID, debateScore: '82' }).success).toBe(false);
    expect(issueClassificationSchema.safeParse({ ...VALID, keyClaims: undefined }).success).toBe(false);
    expect(issueClassificationSchema.safeParse(null).success).toBe(false);
  });
});

describe('issueAxesSchema', () => {
  it('빈 배열과 축 1~2개를 받아들인다', () => {
    expect(issueAxesSchema.parse([])).toEqual([]);
    expect(
      issueAxesSchema.parse([
        { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT },
        { axis: PerspectiveAxis.ECONOMY, agreeDirection: AxisDirection.LEFT },
      ]),
    ).toHaveLength(2);
  });

  it('같은 축을 두 번 지정하면 거부한다', () => {
    expect(
      issueAxesSchema.safeParse([
        { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT },
        { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.LEFT },
      ]).success,
    ).toBe(false);
  });

  it('축이 3개 이상이거나 값이 어긋나면 거부한다', () => {
    expect(
      issueAxesSchema.safeParse([
        { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT },
        { axis: PerspectiveAxis.ECONOMY, agreeDirection: AxisDirection.LEFT },
        { axis: PerspectiveAxis.WELFARE, agreeDirection: AxisDirection.LEFT },
      ]).success,
    ).toBe(false);
    expect(issueAxesSchema.safeParse([{ axis: '노동', agreeDirection: 'RIGHT' }]).success).toBe(false);
    expect(issueAxesSchema.safeParse(null).success).toBe(false);
  });
});
