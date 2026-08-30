import { describe, expect, it } from 'vitest';

import { toPipelineFailure } from '@/pipeline/PipelineFailure';

describe('toPipelineFailure', () => {
  it('Error 인스턴스를 name: message 형식으로 변환한다', () => {
    const error = new TypeError('값이 유효하지 않습니다');
    const result = toPipelineFailure('issue-1', error);

    expect(result.issueId).toBe('issue-1');
    expect(result.message).toBe('TypeError: 값이 유효하지 않습니다');
  });

  it('name 이 없는 Error 는 message 만 사용한다', () => {
    const error = new Error('네트워크 오류');
    const result = toPipelineFailure('issue-2', error);

    expect(result.message).toBe('Error: 네트워크 오류');
  });

  it('cause 가 있으면 ` (cause: …)` 형식으로 추가한다', () => {
    const cause = new Error('데이터베이스 연결 실패');
    const error = new Error('저장 실패');
    error.cause = cause;

    const result = toPipelineFailure('issue-3', error);

    expect(result.message).toContain('Error: 저장 실패 (cause: Error: 데이터베이스 연결 실패)');
  });

  it('메시지가 200자를 넘으면 절단한다', () => {
    const longCause = 'x'.repeat(300);
    const error = new Error('에러');
    error.cause = new Error(longCause);

    const result = toPipelineFailure('issue-4', error);

    expect(result.message.length).toBeLessThanOrEqual(200);
    expect(result.message.endsWith('...')).toBe(true);
  });

  it('Error 가 아닌 값은 String() 으로 변환한다', () => {
    const result = toPipelineFailure('issue-5', 'string error');

    expect(result.message).toBe('string error');
  });

  it('null 은 "null" 로 변환한다', () => {
    const result = toPipelineFailure('issue-6', null);

    expect(result.message).toBe('null');
  });

  it('객체는 String() 으로 변환한다', () => {
    const result = toPipelineFailure('issue-7', { code: 'ERROR_CODE', detail: 'error detail' });

    expect(result.message).toBe('[object Object]');
  });
});
