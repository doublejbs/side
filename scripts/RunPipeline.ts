import 'dotenv/config';

import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../src/data/PrismaClient';
import { classifyIssues } from '../src/pipeline/classifyIssues';
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
import { PipelineEnvKey, readPipelineEnv, type PipelineEnv } from '../src/pipeline/PipelineEnv';
import { withPipelineRun } from '../src/pipeline/PipelineRunLogger';
import { PipelineStep } from '../src/pipeline/PipelineStep';
import {
  ALL_STEPS,
  collectRequiredEnvKeys,
  type RunnableStep,
} from '../src/pipeline/PipelineStepPlan';
import { summarizeIssues } from '../src/pipeline/summarizeIssues';
import type { TextClient } from '../src/pipeline/TextClient';
import { verifyEvidence } from '../src/pipeline/verifyEvidence';

/**
 * 파이프라인 CLI. `npm run pipeline -- [단계] [--issue <id>] [--dry-run]`
 * 근거: `docs/PipelineSpec.md` 4장.
 */

/** 단계마다 필요한 클라이언트만 만들도록 생성을 미룬다. */
interface StepClients {
  newsClient: () => NaverNewsClient;
  embeddingClient: () => EmbeddingClient;
  textClient: () => TextClient;
  /** 분류 전용 저가 모델 클라이언트. */
  nanoTextClient: () => TextClient;
}

interface StepOutcome {
  step: RunnableStep;
  detail: unknown;
}

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

/** 실행할 단계에 필요한 변수만 검사해 환경을 읽는다. dry-run 은 DB 연결 정보만 있으면 된다. */
const readEnvForSteps = (steps: RunnableStep[], dryRun: boolean): PipelineEnv =>
  readPipelineEnv({
    requires: dryRun ? [PipelineEnvKey.DATABASE_URL] : collectRequiredEnvKeys(steps),
  });

const createClients = (env: PipelineEnv, dryRun: boolean): StepClients => {
  if (dryRun) {
    const dryRunTextClient = lazily(createDryRunTextClient);

    return {
      newsClient: lazily(createDryRunNewsClient),
      embeddingClient: lazily(createFakeEmbeddingClient),
      textClient: dryRunTextClient,
      nanoTextClient: dryRunTextClient,
    };
  }

  return {
    newsClient: lazily(() =>
      createNaverNewsClient({
        clientId: env.ncpApigwApiKeyId,
        clientSecret: env.ncpApigwApiKey,
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
    nanoTextClient: lazily(() =>
      createOpenAiTextClient({
        apiKey: env.openAiApiKey,
        model: env.openAiNanoModel,
      }),
    ),
  };
};

/** 실행마다 달라지는 임계값. 환경 변수로만 조정한다. */
interface StepOptions {
  debateThreshold: number;
  exposeLimit: number;
}

const runStep = async (
  step: RunnableStep,
  prisma: PrismaClient,
  clients: StepClients,
  issueId: string | undefined,
  options: StepOptions,
): Promise<unknown> => {
  switch (step) {
    case PipelineStep.COLLECT:
      return collectArticles({ prisma, newsClient: clients.newsClient() });

    case PipelineStep.CLUSTER:
      return clusterArticles({ prisma, embeddingClient: clients.embeddingClient() });

    case PipelineStep.CLASSIFY:
      return classifyIssues({
        prisma,
        nanoTextClient: clients.nanoTextClient(),
        issueId,
        debateThreshold: options.debateThreshold,
      });

    case PipelineStep.SUMMARIZE:
      return summarizeIssues({
        prisma,
        textClient: clients.textClient(),
        issueId,
        debateThreshold: options.debateThreshold,
        exposeLimit: options.exposeLimit,
      });

    case PipelineStep.EXTRACT:
      return extractClaims({
        prisma,
        textClient: clients.textClient(),
        issueId,
        debateThreshold: options.debateThreshold,
        exposeLimit: options.exposeLimit,
      });

    case PipelineStep.VERIFY:
      return verifyEvidence({ prisma, textClient: clients.textClient(), issueId });

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

  const obj = detail as Record<string, unknown>;
  const failed = obj.failed as unknown;
  const failureCount = Array.isArray(failed) ? failed.length : 0;
  const result = Object.entries(obj)
    .filter(([key]) => key !== 'failed')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('  ');

  if (failureCount > 0) {
    return `${result}  failed=${failureCount}`;
  }

  return result;
};

const printFailureDetails = (failures: unknown[]): void => {
  if (!Array.isArray(failures) || failures.length === 0) {
    return;
  }

  const pipelineFailures = failures.filter(
    (f) => f !== null && typeof f === 'object' && 'issueId' in f && 'message' in f,
  );

  if (pipelineFailures.length === 0) {
    return;
  }

  console.log('\n실패 상세:');
  pipelineFailures.forEach((failure) => {
    const f = failure as { issueId: string; message: string };
    console.log(`  ${f.issueId}: ${f.message}`);
  });
};

const printOutcomes = (outcomes: StepOutcome[]): void => {
  if (outcomes.length === 0) {
    return;
  }

  console.log('\n단계        결과');
  console.log('-'.repeat(60));
  outcomes.forEach((outcome) => {
    console.log(`${outcome.step.padEnd(11)} ${formatDetail(outcome.detail)}`);
    const detail = outcome.detail as Record<string, unknown> | null;
    if (detail && detail.failed) {
      printFailureDetails(detail.failed as unknown[]);
    }
  });
};

const main = async (): Promise<void> => {
  const args = parsePipelineArgs(process.argv.slice(2));
  const steps = args.step === PipelineStep.ALL ? ALL_STEPS : [args.step];
  const env = readEnvForSteps(steps, args.dryRun);
  const clients = createClients(env, args.dryRun);
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
        runStep(step, prisma, clients, args.issueId, {
          debateThreshold: env.debateThreshold,
          exposeLimit: env.exposeLimit,
        }),
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
