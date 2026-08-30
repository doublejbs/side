import { describe, expect, it } from 'vitest';

import { createFakePrismaClient } from '@/testing/FakePrismaClient';
import { withPipelineRun } from '@/pipeline/PipelineRunLogger';
import { PipelineRunStatus } from '@/pipeline/PipelineRunStatus';
import { PipelineStep } from '@/pipeline/PipelineStep';

describe('withPipelineRun', () => {
  it('성공하면 결과를 detail 에 남기고 SUCCESS 로 끝낸다', async () => {
    const { db, prisma } = createFakePrismaClient();

    const result = await withPipelineRun(prisma, PipelineStep.SUMMARIZE, async () => ({
      summarized: 2,
      skipped: 1,
    }));

    expect(result).toEqual({ summarized: 2, skipped: 1 });
    expect(db.pipelineRuns).toHaveLength(1);
    expect(db.pipelineRuns[0]).toMatchObject({
      step: PipelineStep.SUMMARIZE,
      status: PipelineRunStatus.SUCCESS,
      detail: { summarized: 2, skipped: 1 },
    });
    expect(db.pipelineRuns[0].finishedAt).toBeInstanceOf(Date);
  });

  it('실행 중에는 RUNNING 으로 기록해 둔다', async () => {
    const { db, prisma } = createFakePrismaClient();

    await withPipelineRun(prisma, PipelineStep.LINK, async () => {
      expect(db.pipelineRuns[0].status).toBe(PipelineRunStatus.RUNNING);
      expect(db.pipelineRuns[0].finishedAt).toBeNull();

      return null;
    });

    expect(db.pipelineRuns[0].status).toBe(PipelineRunStatus.SUCCESS);
  });

  it('실패하면 FAILED 로 기록하고 예외를 다시 던진다', async () => {
    const { db, prisma } = createFakePrismaClient();

    await expect(
      withPipelineRun(prisma, PipelineStep.COLLECT, async () => {
        throw new Error('네이버 API 실패');
      }),
    ).rejects.toThrow('네이버 API 실패');

    expect(db.pipelineRuns[0]).toMatchObject({
      step: PipelineStep.COLLECT,
      status: PipelineRunStatus.FAILED,
      detail: { message: '네이버 API 실패' },
    });
    expect(db.pipelineRuns[0].finishedAt).toBeInstanceOf(Date);
  });

  it('Error 가 아닌 값을 던져도 메시지로 남긴다', async () => {
    const { db, prisma } = createFakePrismaClient();

    await expect(
      withPipelineRun(prisma, PipelineStep.CLUSTER, async () => {
        throw '문자열 오류';
      }),
    ).rejects.toBeTruthy();

    expect(db.pipelineRuns[0].detail).toEqual({ message: '문자열 오류' });
    expect(db.pipelineRuns[0].finishedAt).toBeInstanceOf(Date);
  });
});
