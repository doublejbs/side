import { describe, expect, it } from 'vitest';

import { parsePipelineArgs } from '@/pipeline/parsePipelineArgs';
import { PipelineStep } from '@/pipeline/PipelineStep';

describe('parsePipelineArgs', () => {
  it('인자가 없으면 전체 단계를 실행한다', () => {
    expect(parsePipelineArgs([])).toEqual({ step: PipelineStep.ALL, issueId: undefined, dryRun: false });
  });

  it('단계 이름을 대소문자 구분 없이 읽는다', () => {
    expect(parsePipelineArgs(['summarize']).step).toBe(PipelineStep.SUMMARIZE);
    expect(parsePipelineArgs(['EXTRACT']).step).toBe(PipelineStep.EXTRACT);
  });

  it('--issue 뒤의 값을 이슈 id 로 읽는다', () => {
    expect(parsePipelineArgs(['link', '--issue', 'issue-1'])).toEqual({
      step: PipelineStep.LINK,
      issueId: 'issue-1',
      dryRun: false,
    });
  });

  it('--issue=값 형태도 읽는다', () => {
    expect(parsePipelineArgs(['--issue=issue-2']).issueId).toBe('issue-2');
  });

  it('--dry-run 을 읽는다', () => {
    expect(parsePipelineArgs(['all', '--dry-run']).dryRun).toBe(true);
  });

  it('알 수 없는 단계는 사용법과 함께 예외를 던진다', () => {
    expect(() => parsePipelineArgs(['unknown'])).toThrow('알 수 없는 단계: unknown');
  });

  it('알 수 없는 옵션은 예외를 던진다', () => {
    expect(() => parsePipelineArgs(['--verbose'])).toThrow('알 수 없는 옵션: --verbose');
  });

  it('--issue 뒤에 값이 없으면 예외를 던진다', () => {
    expect(() => parsePipelineArgs(['--issue'])).toThrow('이슈 id 가 필요하다');
    expect(() => parsePipelineArgs(['--issue', '--dry-run'])).toThrow('이슈 id 가 필요하다');
  });
});
