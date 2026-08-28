import 'dotenv/config';

import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../src/data/PrismaClient';
import { clusterArticles } from '../src/pipeline/clusterArticles';
import { collectArticles } from '../src/pipeline/collectArticles';
import { createDryRunNewsClient, createDryRunTextClient } from '../src/pipeline/DryRunClients';
import type { EmbeddingClient } from '../src/pipeline/EmbeddingClient';
import { extractClaims } from '../src/pipeline/extractClaims';
import { createFakeEmbeddingClient } from '../src/pipeline/FakeEmbeddingClient';
import { linkSources } from '../src/pipeline/linkSources';
import { MissingEnvError } from '../src/pipeline/MissingEnvError';
import type { NaverNewsClient } from '../src/pipeline/NaverNewsClient';
import { createNaverNewsClient } from '../src/pipeline/NaverNewsClient';
import { createOpenAiEmbeddingClient } from '../src/pipeline/OpenAiEmbeddingClient';
import { createOpenAiTextClient } from '../src/pipeline/OpenAiTextClient';
import { parsePipelineArgs } from '../src/pipeline/parsePipelineArgs';
import { PipelineEnvKey, readPipelineEnv } from '../src/pipeline/PipelineEnv';
import { withPipelineRun } from '../src/pipeline/PipelineRunLogger';
import { PipelineStep } from '../src/pipeline/PipelineStep';
import { summarizeIssues } from '../src/pipeline/summarizeIssues';
import type { TextClient } from '../src/pipeline/TextClient';

/**
 * 파이프라인 CLI. `npm run pipeline -- [단계] [--issue <id>] [--dry-run]`
 * 근거: `docs/PipelineSpec.md` 4장.
 */

/** 실제로 실행되는 단계. `ALL` 은 `main` 에서 미리 풀어 놓는다. */
type RunnableStep = Exclude<PipelineStep, PipelineStep.ALL>;

/** 단계마다 필요한 클라이언트만 만들도록 생성을 미룬다. */
interface StepClients {
  newsClient: () => NaverNewsClient;
  embeddingClient: () => EmbeddingClient;
  textClient: () => TextClient;
}

interface StepOutcome {
  step: RunnableStep;
  detail: unknown;
}

/** `all` 이 실행하는 순서. */
const ALL_STEPS: RunnableStep[] = [
  PipelineStep.COLLECT,
  PipelineStep.CLUSTER,
  PipelineStep.SUMMARIZE,
  PipelineStep.EXTRACT,
  PipelineStep.LINK,
];

/** 단계별로 실제로 필요한 환경 변수. 실행하지 않는 단계의 키는 검사하지 않는다. */
const REQUIRED_ENV_BY_STEP: Record<RunnableStep, PipelineEnvKey[]> = {
  [PipelineStep.COLLECT]: [
    PipelineEnvKey.DATABASE_URL,
    PipelineEnvKey.NAVER_CLIENT_ID,
    PipelineEnvKey.NAVER_CLIENT_SECRET,
  ],
  [PipelineStep.CLUSTER]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.SUMMARIZE]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.EXTRACT]: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
  [PipelineStep.LINK]: [PipelineEnvKey.DATABASE_URL],
};

const collectRequiredEnvKeys = (steps: RunnableStep[]): PipelineEnvKey[] => [
  ...new Set(steps.flatMap((step) => REQUIRED_ENV_BY_STEP[step])),
];

/** 처음 쓸 때 한 번만 만들고 그다음부터는 같은 인스턴스를 돌려준다. */
const lazily = <T>(create: () => T): (() => T) => {
  let created: { value: T } | undefined;

  return () => {
    if (!created) {
      created = { value: create() };
    }

    return created.value;
  };
};

const createClients = (steps: RunnableStep[], dryRun: boolean): StepClients => {
  if (dryRun) {
    // dry-run 은 외부 호출을 하지 않으므로 DB 연결 정보만 있으면 된다.
    readPipelineEnv({ requires: [PipelineEnvKey.DATABASE_URL] });

    return {
      newsClient: lazily(createDryRunNewsClient),
      embeddingClient: lazily(createFakeEmbeddingClient),
      textClient: lazily(createDryRunTextClient),
    };
  }

  const env = readPipelineEnv({ requires: collectRequiredEnvKeys(steps) });

  return {
    newsClient: lazily(() =>
      createNaverNewsClient({
        clientId: env.naverClientId,
        clientSecret: env.naverClientSecret,
      }),
    ),
    embeddingClient: lazily(() =>
      createOpenAiEmbeddingClient({
        apiKey: env.openAiApiKey,
        model: env.openAiEmbeddingModel,
      }),
    ),
    textClient: lazily(() =>
      createOpenAiTextClient({
        apiKey: env.openAiApiKey,
        model: env.openAiTextModel,
      }),
    ),
  };
};

const runStep = async (
  step: RunnableStep,
  prisma: PrismaClient,
  clients: StepClients,
  issueId: string | undefined,
): Promise<unknown> => {
  switch (step) {
    case PipelineStep.COLLECT:
      return collectArticles({ prisma, newsClient: clients.newsClient() });

    case PipelineStep.CLUSTER:
      return clusterArticles({ prisma, embeddingClient: clients.embeddingClient() });

    case PipelineStep.SUMMARIZE:
      return summarizeIssues({ prisma, textClient: clients.textClient(), issueId });

    case PipelineStep.EXTRACT:
      return extractClaims({ prisma, textClient: clients.textClient(), issueId });

    case PipelineStep.LINK:
      return linkSources({ prisma, issueId });

    default: {
      const exhaustive: never = step;

      throw new Error(`알 수 없는 단계: ${String(exhaustive)}`);
    }
  }
};

const formatDetail = (detail: unknown): string => {
  if (detail === null || typeof detail !== 'object') {
    return String(detail);
  }

  return Object.entries(detail as Record<string, unknown>)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('  ');
};

const printOutcomes = (outcomes: StepOutcome[]): void => {
  if (outcomes.length === 0) {
    return;
  }

  console.log('\n단계        결과');
  console.log('-'.repeat(60));
  outcomes.forEach((outcome) => {
    console.log(`${outcome.step.padEnd(11)} ${formatDetail(outcome.detail)}`);
  });
};

const main = async (): Promise<void> => {
  const args = parsePipelineArgs(process.argv.slice(2));
  const steps = args.step === PipelineStep.ALL ? ALL_STEPS : [args.step];
  const clients = createClients(steps, args.dryRun);
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new MissingEnvError([PipelineEnvKey.DATABASE_URL]);
  }

  if (args.dryRun) {
    console.log('dry-run: 외부 호출 없이 가짜 뉴스·임베딩·텍스트 클라이언트로 실행한다.');
  }

  const outcomes: StepOutcome[] = [];

  try {
    for (const step of steps) {
      const detail = await withPipelineRun(prisma, step, () =>
        runStep(step, prisma, clients, args.issueId),
      );

      outcomes.push({ step, detail });
    }
  } finally {
    printOutcomes(outcomes);
    await prisma.$disconnect();
  }
};

/** 원인을 찾을 수 있도록 메시지만이 아니라 스택도 함께 출력한다. */
main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
