/** 서버 로그 출력을 이 헬퍼 한 곳으로 모은다(콘솔 사용 허용 지점). */
export const logServerError = (context: string, error: unknown): void => {
  console.error(context, error);
};
