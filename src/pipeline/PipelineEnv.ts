import { MAX_DEBATE_SCORE, MIN_DEBATE_SCORE } from '@/pipeline/ClassifySchema';
import { InvalidEnvValueError } from '@/pipeline/InvalidEnvValueError';
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
  openAiNanoModel: string;
  openAiEmbeddingModel: string;
  debateThreshold: number;
  exposeLimit: number;
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
 * 텍스트 생성 기본 모델. 요약·논점 추출·근거 검증이 쓴다.
 * Structured Outputs 확장 제약(`minItems` 등)을 지원하는 모델이어야 한다.
 */
export const DEFAULT_TEXT_MODEL = 'gpt-5.4-mini';

/** 분류 전용 저가 모델. 넓게 걸러내는 classify 단계만 쓴다. */
export const DEFAULT_NANO_MODEL = 'gpt-5.4-nano';

/** 임베딩 기본 모델. */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

/** classify 통과 기준 점수. 미달 이슈는 자동 제외한다. */
export const DEFAULT_DEBATE_THRESHOLD = 60;

/** 실행 한 번에 요약·추출까지 진행할 이슈 수 상한. */
export const DEFAULT_EXPOSE_LIMIT = 10;

/** 노출 상한이 가질 수 있는 최댓값. 실수로 큰 값을 넣어 비용이 터지지 않게 막는다. */
const MAX_EXPOSE_LIMIT = 100;

const read = (source: EnvSource, key: string): string => (source[key] ?? '').trim();

interface NumberRange {
  min: number;
  max: number;
}

/** 비어 있으면 기본값을 쓰고, 값이 있으면 정수인지와 범위를 확인한다. */
const readNumber = (
  source: EnvSource,
  key: string,
  fallback: number,
  { min, max }: NumberRange,
): number => {
  const raw = read(source, key);

  if (raw.length === 0) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new InvalidEnvValueError(key, raw, `${min}~${max} 사이의 정수`);
  }

  return parsed;
};

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
    openAiNanoModel: read(source, 'OPENAI_NANO_MODEL') || DEFAULT_NANO_MODEL,
    openAiEmbeddingModel: read(source, 'OPENAI_EMBEDDING_MODEL') || DEFAULT_EMBEDDING_MODEL,
    debateThreshold: readNumber(source, 'PIPELINE_DEBATE_THRESHOLD', DEFAULT_DEBATE_THRESHOLD, {
      min: MIN_DEBATE_SCORE,
      max: MAX_DEBATE_SCORE,
    }),
    exposeLimit: readNumber(source, 'PIPELINE_EXPOSE_LIMIT', DEFAULT_EXPOSE_LIMIT, {
      min: 1,
      max: MAX_EXPOSE_LIMIT,
    }),
  };
};
