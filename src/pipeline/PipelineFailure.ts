/**
 * 파이프라인 단계 실행 중 실패한 이슈의 원인 정보.
 */
export interface PipelineFailure {
  issueId: string;
  message: string;
}

/**
 * 에러를 PipelineFailure로 변환한다.
 * - Error 인스턴스면 `${name}: ${message}` 형식
 * - cause 가 있으면 ` (cause: …)` 추가, 전체 200자에서 절단
 * - 그 외에는 `String(error)`
 */
export const toPipelineFailure = (issueId: string, error: unknown): PipelineFailure => {
  let message: string;

  if (error instanceof Error) {
    const name = error.name ? `${error.name}: ` : '';
    const mainMsg = `${name}${error.message}`;

    if (error.cause) {
      const causeMsg = String(error.cause);
      const fullMsg = `${mainMsg} (cause: ${causeMsg})`;
      message = fullMsg.length > 200 ? `${fullMsg.slice(0, 197)}...` : fullMsg;
    } else {
      message = mainMsg;
    }
  } else {
    message = String(error);
  }

  return { issueId, message };
};
