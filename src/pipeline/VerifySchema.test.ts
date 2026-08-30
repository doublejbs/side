import { describe, expect, it } from 'vitest';

import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { verifySchema } from '@/pipeline/VerifySchema';

const verdict = (overrides: Record<string, unknown> = {}) => ({
  evidenceId: 'evidence-1',
  support: EvidenceSupport.SUPPORTS,
  type: EvidenceType.FACT,
  note: '기사 내용이 주장을 직접 뒷받침한다.',
  ...overrides,
});

describe('verifySchema', () => {
  it('올바른 판정 목록을 통과시킨다', () => {
    const result = verifySchema.parse({ verdicts: [verdict(), verdict({ evidenceId: 'evidence-2' })] });

    expect(result.verdicts).toHaveLength(2);
  });

  it('판정이 하나도 없으면 막는다', () => {
    expect(() => verifySchema.parse({ verdicts: [] })).toThrow();
  });

  it('목록에 없는 support 값은 막는다', () => {
    expect(() => verifySchema.parse({ verdicts: [verdict({ support: 'MAYBE' })] })).toThrow();
  });

  it('목록에 없는 type 값은 막는다', () => {
    expect(() => verifySchema.parse({ verdicts: [verdict({ type: 'OPINION' })] })).toThrow();
  });

  it('근거 id 와 판정 근거는 비어 있을 수 없다', () => {
    expect(() => verifySchema.parse({ verdicts: [verdict({ evidenceId: '  ' })] })).toThrow();
    expect(() => verifySchema.parse({ verdicts: [verdict({ note: '' })] })).toThrow();
  });
});
