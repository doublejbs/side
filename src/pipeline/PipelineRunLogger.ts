import type { Prisma, PrismaClient } from '@prisma/client';

import { PipelineRunStatus } from '@/pipeline/PipelineRunStatus';

/** Json 컬럼에 넣을 수 있도록 직렬화한다. Date 등은 문자열이 된다. */
const toJsonDetail = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const toErrorDetail = (error: unknown): Prisma.InputJsonValue => ({
  message: error instanceof Error ? error.message : String(error),
});

/**
 * 단계 실행을 `PipelineRun` 에 기록한다.
 * 시작 시 RUNNING 행을 만들고, 성공하면 결과를, 실패하면 메시지를 `detail` 에 남긴 뒤 예외를 다시 던진다.
 * 근거: `docs/PipelineSpec.md` 4장.
 */
export const withPipelineRun = async <T>(
  prisma: PrismaClient,
  step: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const run = await prisma.pipelineRun.create({
    data: { step, status: PipelineRunStatus.RUNNING },
  });

  try {
    const result = await fn();

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: PipelineRunStatus.SUCCESS,
        detail: toJsonDetail(result),
        finishedAt: new Date(),
      },
    });

    return result;
  } catch (error) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: PipelineRunStatus.FAILED,
        detail: toErrorDetail(error),
        finishedAt: new Date(),
      },
    });

    throw error;
  }
};
