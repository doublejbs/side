import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '@/data/PrismaClient';
import { createOpenAiTextClient } from '@/pipeline/OpenAiTextClient';
import { PipelineEnvKey, readPipelineEnv } from '@/pipeline/PipelineEnv';
import type { TextClient } from '@/pipeline/TextClient';

export interface PipelineDeps {
  prisma: PrismaClient;
  textClient: TextClient;
}

/**
 * 관리자 화면에서 파이프라인을 다시 돌릴 때 필요한 의존성을 한곳에서 조립한다.
 * 서버 액션이 Prisma·OpenAI 를 직접 만들지 않도록 경계를 여기로 모은다.
 * DB 나 환경 변수가 없으면 `null` 을 돌려주고 호출부가 안내 메시지를 고른다.
 */
export const getPipelineDeps = (): PipelineDeps | null => {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    // 재생성은 뉴스 수집을 돌지 않으므로 LLM 키만 있으면 된다.
    const env = readPipelineEnv({ requires: [PipelineEnvKey.OPENAI_API_KEY] });

    return {
      prisma,
      textClient: createOpenAiTextClient({
        apiKey: env.openAiApiKey,
        model: env.openAiTextModel,
      }),
    };
  } catch {
    return null;
  }
};
