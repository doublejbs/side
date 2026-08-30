import { PipelineStep } from '@/pipeline/PipelineStep';

export interface PipelineArgs {
  step: PipelineStep;
  /** 지정하면 그 이슈만 처리한다. */
  issueId?: string;
  /** 외부 호출 없이 가짜 클라이언트로 실행한다. */
  dryRun: boolean;
}

export const PIPELINE_USAGE =
  'npm run pipeline -- [collect|cluster|summarize|extract|link|all] [--issue <id>] [--dry-run]';

const STEP_BY_NAME = new Map<string, PipelineStep>(
  Object.values(PipelineStep).map((step) => [step.toLowerCase(), step]),
);

const toStep = (value: string): PipelineStep => {
  const step = STEP_BY_NAME.get(value.toLowerCase());

  if (!step) {
    throw new Error(`알 수 없는 단계: ${value}\n${PIPELINE_USAGE}`);
  }

  return step;
};

/** CLI 인자를 읽는다. 단계를 생략하면 전체(`all`) 실행이다. */
export const parsePipelineArgs = (argv: string[]): PipelineArgs => {
  let step = PipelineStep.ALL;
  let issueId: string | undefined;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      dryRun = true;

      continue;
    }

    if (arg === '--issue' || arg.startsWith('--issue=')) {
      const value = arg.startsWith('--issue=') ? arg.slice('--issue='.length) : argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`--issue 뒤에 이슈 id 가 필요하다.\n${PIPELINE_USAGE}`);
      }

      issueId = value;

      if (!arg.startsWith('--issue=')) {
        index += 1;
      }

      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`알 수 없는 옵션: ${arg}\n${PIPELINE_USAGE}`);
    }

    step = toStep(arg);
  }

  return { step, issueId, dryRun };
};
