import type { EvidenceSupport } from '@/domain/EvidenceSupport';
import type { EvidenceType } from '@/domain/EvidenceType';

/**
 * verify 단계(4.3)가 근거 하나에 내리는 판정.
 * `evidenceId` 는 입력으로 넘긴 근거 id 여야 한다(모델이 인덱스를 지어내지 못하게 한다).
 * 근거: `docs/PipelineTieringSpec.md` 3장.
 */
export interface EvidenceVerdict {
  evidenceId: string;
  support: EvidenceSupport;
  /** 재판정한 근거 타입. 기존 값과 달라질 수 있다. */
  type: EvidenceType;
  /** 판정 근거 한 줄. */
  note: string;
}
