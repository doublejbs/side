import { describe, expect, it } from 'vitest';

import { PipelineEnvKey } from '@/pipeline/PipelineEnv';
import { PipelineStep } from '@/pipeline/PipelineStep';
import {
  ALL_STEPS,
  collectRequiredEnvKeys,
  REQUIRED_ENV_BY_STEP,
} from '@/pipeline/PipelineStepPlan';

describe('ALL_STEPS', () => {
  it('수집 → 묶기 → 분류 → 요약 → 추출 → 검증 → 연결 순서로 실행한다', () => {
    expect(ALL_STEPS).toEqual([
      PipelineStep.COLLECT,
      PipelineStep.CLUSTER,
      PipelineStep.CLASSIFY,
      PipelineStep.SUMMARIZE,
      PipelineStep.EXTRACT,
      PipelineStep.VERIFY,
      PipelineStep.LINK,
    ]);
  });

  it('`ALL` 을 제외한 모든 단계를 한 번씩 담는다', () => {
    const runnable = Object.values(PipelineStep).filter((step) => step !== PipelineStep.ALL);

    expect([...ALL_STEPS].sort()).toEqual([...runnable].sort());
  });
});

describe('REQUIRED_ENV_BY_STEP', () => {
  it('분류·검증은 OpenAI 키를 요구한다', () => {
    expect(REQUIRED_ENV_BY_STEP[PipelineStep.CLASSIFY]).toContain(PipelineEnvKey.OPENAI_API_KEY);
    expect(REQUIRED_ENV_BY_STEP[PipelineStep.VERIFY]).toContain(PipelineEnvKey.OPENAI_API_KEY);
  });

  it('연결 단계는 DB 연결 정보만 있으면 된다', () => {
    expect(REQUIRED_ENV_BY_STEP[PipelineStep.LINK]).toEqual([PipelineEnvKey.DATABASE_URL]);
  });
});

describe('collectRequiredEnvKeys', () => {
  it('여러 단계의 요구 사항을 중복 없이 모은다', () => {
    expect(collectRequiredEnvKeys([PipelineStep.CLASSIFY, PipelineStep.VERIFY])).toEqual([
      PipelineEnvKey.DATABASE_URL,
      PipelineEnvKey.OPENAI_API_KEY,
    ]);
  });

  it('전체 실행은 수집 키까지 요구한다', () => {
    expect(collectRequiredEnvKeys(ALL_STEPS)).toEqual([
      PipelineEnvKey.DATABASE_URL,
      PipelineEnvKey.NCP_APIGW_API_KEY_ID,
      PipelineEnvKey.NCP_APIGW_API_KEY,
      PipelineEnvKey.OPENAI_API_KEY,
    ]);
  });
});
