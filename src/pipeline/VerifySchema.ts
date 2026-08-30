import { z } from 'zod';

import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';

/** 구조화 출력에서 모델에게 보여줄 스키마 이름. */
export const VERIFY_SCHEMA_NAME = 'evidence_verification';

const nonEmptyText = z.string().trim().min(1);

/**
 * 근거 검증 단계의 구조화 출력 스키마.
 * `evidenceId` 는 입력으로 넘긴 근거 id 다. 인덱스를 쓰지 않는 이유는 근거가 주장별로 나뉘어
 * 하나의 전역 인덱스를 만들 수 없기 때문이다. 목록에 없는 id 는 `verifyEvidence` 가 버린다.
 * 근거: `docs/PipelineTieringSpec.md` 4.3장.
 */
export const verifySchema = z.object({
  verdicts: z
    .array(
      z.object({
        evidenceId: nonEmptyText,
        support: z.enum(EvidenceSupport),
        type: z.enum(EvidenceType),
        note: nonEmptyText,
      }),
    )
    .min(1),
});

export type VerifyResult = z.infer<typeof verifySchema>;
