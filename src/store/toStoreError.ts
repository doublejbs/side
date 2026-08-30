/** 서버 통신 실패 사유를 화면이 쓸 수 있는 `Error` 로 정규화한다. */
export const toStoreError = (reason: unknown, fallbackMessage: string): Error =>
  reason instanceof Error ? reason : new Error(fallbackMessage);
