/**
 * 로그인이 필요한 요청(투표·근거 피드백)을 비로그인 상태로 보냈을 때의 오류.
 * 서버는 `401 { error: 'LOGIN_REQUIRED' }` 로 답하고, 화면은 이 오류를 로그인 안내로 바꾼다.
 */
export class LoginRequiredError extends Error {
  constructor() {
    super('로그인이 필요해요');
    this.name = 'LoginRequiredError';
  }
}

export const isLoginRequiredError = (reason: unknown): boolean =>
  reason instanceof LoginRequiredError;
