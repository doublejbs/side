import type { AuthGateway } from '@/lib/auth/AuthGateway';
import { logServerError } from '@/server/logServerError';

/** POST 를 GET 리다이렉트로 바꿔야 하므로 303 을 쓴다. */
const SEE_OTHER = 303;

/** 교차 출처 요청을 거절할 때 쓰는 상태 코드. */
const FORBIDDEN = 403;

/** 로그아웃 후 돌아갈 곳. */
const HOME_PATH = '/';

export interface SignOutDeps {
  gateway: AuthGateway;
  /** `isSameOriginRequest` 의 판정 결과. false 면 로그아웃을 수행하지 않는다. */
  isSameOrigin: boolean;
}

export interface SignOutResult {
  /** 303(로그아웃 후 리다이렉트) 또는 403(교차 출처 거절). */
  status: number;
  /** 403 이면 리다이렉트하지 않으므로 null. */
  redirectTo: string | null;
  /** 로그아웃 시 legacy 익명 쿠키도 함께 지운다. */
  clearAnonCookie: boolean;
}

/**
 * `POST /auth/signout` 의 순수 로직. 교차 출처면 로그아웃하지 않고 막는다(CSRF).
 * 게이트웨이가 던져도 사용자 입장에서는 이미 로그아웃된 것과 같으므로 성공으로 다루고 로그만 남긴다.
 * 근거: docs/AuthSpec.md 4.1.
 */
export const handleSignOut = async ({
  gateway,
  isSameOrigin,
}: SignOutDeps): Promise<SignOutResult> => {
  if (!isSameOrigin) {
    return { status: FORBIDDEN, redirectTo: null, clearAnonCookie: false };
  }

  try {
    await gateway.signOut();
  } catch (error) {
    logServerError('로그아웃 실패', error);
  }

  return { status: SEE_OTHER, redirectTo: HOME_PATH, clearAnonCookie: true };
};
