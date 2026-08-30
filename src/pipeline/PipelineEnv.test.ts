import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvalidEnvValueError } from '@/pipeline/InvalidEnvValueError';
import { MissingEnvError } from '@/pipeline/MissingEnvError';
import { PipelineEnvKey, readPipelineEnv } from '@/pipeline/PipelineEnv';

const FULL_ENV = {
  DATABASE_URL: 'postgresql://side:side@localhost:5432/side',
  NCP_APIGW_API_KEY_ID: 'ncp-id',
  NCP_APIGW_API_KEY: 'ncp-secret',
  OPENAI_API_KEY: 'openai-key',
};

const stubProcessEnv = (env: Record<string, string | undefined>): void => {
  Object.entries(env).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('readPipelineEnv', () => {
  it('필수 변수를 읽고 모델은 기본값을 채운다', () => {
    stubProcessEnv({
      ...FULL_ENV,
      OPENAI_TEXT_MODEL: undefined,
      OPENAI_NANO_MODEL: undefined,
      OPENAI_EMBEDDING_MODEL: undefined,
      PIPELINE_DEBATE_THRESHOLD: undefined,
      PIPELINE_EXPOSE_LIMIT: undefined,
    });

    expect(readPipelineEnv()).toEqual({
      databaseUrl: FULL_ENV.DATABASE_URL,
      ncpApigwApiKeyId: 'ncp-id',
      ncpApigwApiKey: 'ncp-secret',
      openAiApiKey: 'openai-key',
      openAiTextModel: 'gpt-5.4-mini',
      openAiNanoModel: 'gpt-5.4-nano',
      openAiEmbeddingModel: 'text-embedding-3-small',
      debateThreshold: 60,
      exposeLimit: 10,
    });
  });

  it('모델 환경 변수가 있으면 그 값을 쓴다', () => {
    stubProcessEnv({
      ...FULL_ENV,
      OPENAI_TEXT_MODEL: 'gpt-5',
      OPENAI_EMBEDDING_MODEL: 'text-embedding-3-large',
    });

    const env = readPipelineEnv();

    expect(env.openAiTextModel).toBe('gpt-5');
    expect(env.openAiEmbeddingModel).toBe('text-embedding-3-large');
  });

  it('분류 모델 환경 변수가 있으면 그 값을 쓴다', () => {
    stubProcessEnv({ ...FULL_ENV, OPENAI_NANO_MODEL: 'gpt-5-nano' });

    expect(readPipelineEnv().openAiNanoModel).toBe('gpt-5-nano');
  });

  it('임계값·노출 상한을 숫자로 읽는다', () => {
    const env = readPipelineEnv({
      source: { ...FULL_ENV, PIPELINE_DEBATE_THRESHOLD: '75', PIPELINE_EXPOSE_LIMIT: '3' },
    });

    expect(env.debateThreshold).toBe(75);
    expect(env.exposeLimit).toBe(3);
  });

  it('임계값이 숫자가 아니면 InvalidEnvValueError 를 던진다', () => {
    expect(() =>
      readPipelineEnv({ source: { ...FULL_ENV, PIPELINE_DEBATE_THRESHOLD: '높음' } }),
    ).toThrow(InvalidEnvValueError);
  });

  it('임계값이 0~100 을 벗어나면 InvalidEnvValueError 를 던진다', () => {
    expect(() =>
      readPipelineEnv({ source: { ...FULL_ENV, PIPELINE_DEBATE_THRESHOLD: '101' } }),
    ).toThrow(InvalidEnvValueError);
  });

  it('노출 상한이 1 미만이면 InvalidEnvValueError 를 던진다', () => {
    expect(() => readPipelineEnv({ source: { ...FULL_ENV, PIPELINE_EXPOSE_LIMIT: '0' } })).toThrow(
      InvalidEnvValueError,
    );
  });

  it('빠진 필수 변수 이름을 모두 담아 MissingEnvError 를 던진다', () => {
    stubProcessEnv({
      ...FULL_ENV,
      DATABASE_URL: undefined,
      NCP_APIGW_API_KEY: '   ',
    });

    try {
      readPipelineEnv();
      expect.unreachable('MissingEnvError 가 발생해야 한다');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect((error as MissingEnvError).missingKeys).toEqual([
        'DATABASE_URL',
        'NCP_APIGW_API_KEY',
      ]);
    }
  });

  it('전달한 환경 객체를 읽을 수 있다', () => {
    const env = readPipelineEnv({ source: { ...FULL_ENV } });

    expect(env.ncpApigwApiKeyId).toBe('ncp-id');
  });

  it('requires 로 지정한 변수만 검사한다', () => {
    const env = readPipelineEnv({
      source: { DATABASE_URL: FULL_ENV.DATABASE_URL },
      requires: [PipelineEnvKey.DATABASE_URL],
    });

    expect(env.databaseUrl).toBe(FULL_ENV.DATABASE_URL);
    expect(env.openAiApiKey).toBe('');
  });

  it('requires 에 담긴 변수가 없으면 그 이름만 알린다', () => {
    try {
      readPipelineEnv({
        source: { DATABASE_URL: FULL_ENV.DATABASE_URL },
        requires: [PipelineEnvKey.DATABASE_URL, PipelineEnvKey.OPENAI_API_KEY],
      });
      expect.unreachable('MissingEnvError 가 발생해야 한다');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect((error as MissingEnvError).missingKeys).toEqual(['OPENAI_API_KEY']);
    }
  });

  it('requires 를 생략하면 전체 필수 목록을 검사한다', () => {
    try {
      readPipelineEnv({ source: {} });
      expect.unreachable('MissingEnvError 가 발생해야 한다');
    } catch (error) {
      expect((error as MissingEnvError).missingKeys).toEqual([
        'DATABASE_URL',
        'NCP_APIGW_API_KEY_ID',
        'NCP_APIGW_API_KEY',
        'OPENAI_API_KEY',
      ]);
    }
  });
});
