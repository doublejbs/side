/**
 * 근거가 주장을 얼마나 지지하는지에 대한 판정. verify 단계(4.3)가 매긴다.
 * Prisma `EvidenceSupport` 와 값이 같은 도메인 enum 이다.
 */
export enum EvidenceSupport {
  /** 주장을 직접 뒷받침한다. */
  SUPPORTS = 'SUPPORTS',
  /** 일부만 뒷받침하거나 조건이 붙는다. */
  PARTIAL = 'PARTIAL',
  /** 주장과 관련이 없다. */
  UNRELATED = 'UNRELATED',
  /** 주장과 반대되는 내용이다. */
  CONTRADICTS = 'CONTRADICTS',
}
