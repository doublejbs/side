import { PipelineEnvKey } from '@/pipeline/PipelineEnv';
import { PipelineStep } from '@/pipeline/PipelineStep';

/** 실제로 실행되는 단계. `ALL` 은 CLI 가 미리 풀어 놓는다. */
export type RunnableStep = Exclude<PipelineStep, PipelineStep.ALL>;

/**
 * `all` 이 실행하는 순서.
 * 분류(classify)로 넓게 거른 뒤에야 비싼 요약·추출을 돌리고, 근거 검증까지 끝난 이슈만 검수로 넘긴다.
 * 근거: `docs/PipelineTieringSpec.md` 4.5장.
 */
export const ALL_STEPS: RunnableStep[] = [
  PipelineStep.COLLECT,
  PipelineStep.CLUSTER,
  PipelineStep.CLASSIFY,
  PipelineStep.SUMMARIZE,
  PipelineStep.EXTRACT,
  PipelineStep.VERIFY,
  PipelineStep.LINK,
];

/** 단계별로 실제로 필요한 환경 변수. 실행하지 않는 단계의 키는 검사하지 않는다. */
export const REQUIRED_ENV_BY_STEP: Record<RunnableStep, PipelineEnvKey[]> = {
  [PipelineStep.COLLECT]: [
    PipelineEnvKey.DATABASE_URL,
    PipelineEnvKey.NCP_APIGW_API_KEY_ID,
    PipelineEnvKey.NCP_APIGW_API_KEY,
  ],
  [PipelineStep.CLUSTER]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.CLASSIFY]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.SUMMARIZE]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.EXTRACT]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.VERIFY]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.LINK]: [PipelineEnvKey.DATABASE_URL],
};

/** 실행할 단계들이 함께 요구하는 환경 변수 목록(중복 제거). */
export const collectRequiredEnvKeys = (steps: RunnableStep[]): PipelineEnvKey[] => [
  ...new Set(steps.flatMap((step) => REQUIRED_ENV_BY_STEP[step])),
];
