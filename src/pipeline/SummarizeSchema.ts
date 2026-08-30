import { z } from 'zod';

import { isStanceQuestion } from '@/pipeline/isStanceQuestion';

/** 구조화 출력에서 모델에게 보여줄 스키마 이름. */
export const SUMMARIZE_SCHEMA_NAME = 'issue_summary';

/** 질문형 제목의 최대 길이(브리프 22장: 짧고 담백한 질문). */
const MAX_QUESTION_LENGTH = 30;

const nonEmptyText = z.string().trim().min(1);

/**
 * 이슈 요약 단계의 구조화 출력 스키마.
 * 근거: `docs/PipelineSpec.md` 4.3장.
 */
export const summarizeSchema = z.object({
  question: nonEmptyText
    .max(MAX_QUESTION_LENGTH)
    .refine((value) => value.endsWith('?'), { message: '질문형 제목은 물음표로 끝나야 한다' })
    .refine(isStanceQuestion, {
      message:
        '질문 형식 위반: 찬성/반대로 답할 수 있는 정책 질문이어야 한다(설명·예측형 질문은 쓸 수 없다)',
    }),
  tags: z.array(nonEmptyText).length(2),
  summary: z.array(nonEmptyText).min(3).max(5),
  keyPoints: z
    .array(
      z.object({
        title: nonEmptyText,
        question: nonEmptyText,
      }),
    )
    .length(4),
});

export type SummarizeResult = z.infer<typeof summarizeSchema>;
