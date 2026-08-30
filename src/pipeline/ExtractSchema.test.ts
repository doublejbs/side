import { describe, expect, it } from 'vitest';

import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { extractSchema } from '@/pipeline/ExtractSchema';

const claimOf = (side: ClaimSide, index: number) => ({
  side,
  title: `${side} 주장 ${index}`,
  description: '기사에서 확인된 설명 문장이다. 두 번째 문장이다.',
  evidences: [
    { articleIndex: 0, type: EvidenceType.FACT, summary: '첫 번째 근거 요약' },
    { articleIndex: 1, type: EvidenceType.EXPERT, summary: '두 번째 근거 요약' },
  ],
});

const groupOf = (label: string, share: number) => ({
  label,
  share,
  description: '이 그룹의 특징을 설명한다.',
  agreesWith: [0],
  disagreesWith: [3],
  mostDivided: [1],
});

const VALID = {
  claims: [
    claimOf(ClaimSide.AGREE, 1),
    claimOf(ClaimSide.AGREE, 2),
    claimOf(ClaimSide.AGREE, 3),
    claimOf(ClaimSide.DISAGREE, 1),
    claimOf(ClaimSide.DISAGREE, 2),
    claimOf(ClaimSide.DISAGREE, 3),
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      frame: '노동자의 삶의 질',
      keywords: ['노동시간', '삶의 질', '휴식'],
      representativeArticleIndex: 0,
    },
  ],
  commonCoverage: ['법안이 발의된 사실', '정부의 시범 사업 검토'],
  opinionGroups: [groupOf('그룹 A', 40), groupOf('그룹 B', 35), groupOf('그룹 C', 25)],
};

describe('extractSchema', () => {
  it('올바른 응답을 통과시킨다', () => {
    expect(extractSchema.parse(VALID).claims).toHaveLength(6);
  });

  it('주장이 6개가 아니면 거절한다', () => {
    expect(extractSchema.safeParse({ ...VALID, claims: VALID.claims.slice(0, 5) }).success).toBe(false);
  });

  it('찬성과 반대가 3개씩이 아니면 거절한다', () => {
    const claims = [...VALID.claims.slice(0, 3), claimOf(ClaimSide.AGREE, 4), ...VALID.claims.slice(4)];

    expect(extractSchema.safeParse({ ...VALID, claims }).success).toBe(false);
  });

  it('근거가 2개 미만인 주장을 거절한다', () => {
    const claims = [{ ...VALID.claims[0], evidences: VALID.claims[0].evidences.slice(0, 1) }, ...VALID.claims.slice(1)];

    expect(extractSchema.safeParse({ ...VALID, claims }).success).toBe(false);
  });

  it('음수이거나 정수가 아닌 기사 인덱스를 거절한다', () => {
    const withNegative = [
      { ...VALID.claims[0], evidences: [{ articleIndex: -1, type: EvidenceType.FACT, summary: 'x' }, VALID.claims[0].evidences[1]] },
      ...VALID.claims.slice(1),
    ];

    expect(extractSchema.safeParse({ ...VALID, claims: withNegative }).success).toBe(false);
  });

  it('언론 관점이 3개를 넘으면 거절한다', () => {
    const mediaPerspectives = [
      VALID.mediaPerspectives[0],
      VALID.mediaPerspectives[0],
      VALID.mediaPerspectives[0],
      VALID.mediaPerspectives[0],
    ];

    expect(extractSchema.safeParse({ ...VALID, mediaPerspectives }).success).toBe(false);
  });

  it('언론 관점이 0개여도 통과시킨다', () => {
    expect(extractSchema.safeParse({ ...VALID, mediaPerspectives: [] }).success).toBe(true);
  });

  it('키워드가 3개가 아니면 거절한다', () => {
    const mediaPerspectives = [{ ...VALID.mediaPerspectives[0], keywords: ['하나', '둘'] }];

    expect(extractSchema.safeParse({ ...VALID, mediaPerspectives }).success).toBe(false);
  });

  it('공통 내용이 2~3개가 아니면 거절한다', () => {
    expect(extractSchema.safeParse({ ...VALID, commonCoverage: ['하나'] }).success).toBe(false);
    expect(extractSchema.safeParse({ ...VALID, commonCoverage: ['1', '2', '3', '4'] }).success).toBe(false);
  });

  it('의견 그룹이 3개가 아니면 거절한다', () => {
    expect(extractSchema.safeParse({ ...VALID, opinionGroups: VALID.opinionGroups.slice(0, 2) }).success).toBe(false);
  });

  it('의견 그룹 비율의 합이 100을 넘으면 거절한다', () => {
    const opinionGroups = [groupOf('그룹 A', 50), groupOf('그룹 B', 40), groupOf('그룹 C', 30)];

    expect(extractSchema.safeParse({ ...VALID, opinionGroups }).success).toBe(false);
  });

  it('주장 인덱스가 5를 넘으면 거절한다', () => {
    const opinionGroups = [{ ...groupOf('그룹 A', 40), agreesWith: [6] }, groupOf('그룹 B', 35), groupOf('그룹 C', 25)];

    expect(extractSchema.safeParse({ ...VALID, opinionGroups }).success).toBe(false);
  });
});
