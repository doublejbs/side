import { MissingEnvError } from '@/pipeline/MissingEnvError';

/** `process.env` 처럼 문자열 값을 담은 환경 변수 원본. 테스트에서 대체할 수 있다. */
type EnvSource = Record<string, string | undefined>;

/** 파이프라인이 존재를 강제하는 환경 변수 이름. 단계별 필수 목록을 이 값들로 조립한다. */
export enum PipelineEnvKey {
  DATABASE_URL = 'DATABASE_URL',
  NCP_APIGW_API_KEY_ID = 'NCP_APIGW_API_KEY_ID',
  NCP_APIGW_API_KEY = 'NCP_APIGW_API_KEY',
  OPENAI_API_KEY = 'OPENAI_API_KEY',
}

export interface PipelineEnv {
  databaseUrl: string;
  ncpApigwApiKeyId: string;
  ncpApigwApiKey: string;
  openAiApiKey: string;
  openAiTextModel: string;
  openAiEmbeddingModel: string;
}

export interface ReadPipelineEnvOptions {
  /** 읽을 환경 변수 원본. 생략하면 `process.env`. */
  source?: EnvSource;
  /** 이번 실행에 실제로 필요한 변수 이름. 생략하면 전체 필수 목록을 검사한다. */
  requires?: PipelineEnvKey[];
}

/** 인자 없이 부를 때 검사하는 기본 필수 목록. */
export const ALL_REQUIRED_ENV_KEYS: PipelineEnvKey[] = [
  PipelineEnvKey.DATABASE_URL,
  PipelineEnvKey.NCP_APIGW_API_KEY_ID,
  PipelineEnvKey.NCP_APIGW_API_KEY,
  PipelineEnvKey.OPENAI_API_KEY,
];

/**
 * 텍스트 생성 기본 모델.
 * Structured Outputs 확장 제약(`minItems` 등)을 지원하는 모델이어야 한다.
 */
export const DEFAULT_TEXT_MODEL = 'gpt-5-mini';

/** 임베딩 기본 모델. */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

const read = (source: EnvSource, key: string): string => (source[key] ?? '').trim();

/**
 * 파이프라인 CLI 가 쓰는 환경 변수를 읽는다.
 * `requires` 로 이번 단계에 필요한 변수만 검사할 수 있고, 하나라도 없으면
 * 빠진 이름을 모두 담아 `MissingEnvError` 를 던진다.
 * 근거: docs/PipelineSpec.md 2장.
 */
export const readPipelineEnv = ({
  source = process.env,
  requires = ALL_REQUIRED_ENV_KEYS,
}: ReadPipelineEnvOptions = {}): PipelineEnv => {
  const missingKeys = requires.filter((key) => read(source, key).length === 0);

  if (missingKeys.length > 0) {
    throw new MissingEnvError([...missingKeys]);
  }

  return {
    databaseUrl: read(source, PipelineEnvKey.DATABASE_URL),
    ncpApigwApiKeyId: read(source, PipelineEnvKey.NCP_APIGW_API_KEY_ID),
    ncpApigwApiKey: read(source, PipelineEnvKey.NCP_APIGW_API_KEY),
    openAiApiKey: read(source, PipelineEnvKey.OPENAI_API_KEY),
    openAiTextModel: read(source, 'OPENAI_TEXT_MODEL') || DEFAULT_TEXT_MODEL,
    openAiEmbeddingModel: read(source, 'OPENAI_EMBEDDING_MODEL') || DEFAULT_EMBEDDING_MODEL,
  };
};
