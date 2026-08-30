import type { AuthGateway } from '@/lib/auth/AuthGateway';
import { sanitizeNextPath } from '@/lib/auth/buildLoginHref';
import { logServerError } from '@/server/logServerError';
import { migrateAnonVotes } from '@/server/migrateAnonVotes';
import type { VoteStore } from '@/server/VoteStore';

/** 로그인 실패 시 보낼 곳. `LoginPageView` 가 `error` 파라미터로 안내를 띄운다. */
const LOGIN_ERROR_PATH = '/login?error=1';

export interface AuthCallbackDeps {
  code: string | null;
  next: string | null;
  gateway: AuthGateway;
  /** 목 데이터 모드면 null. 이때는 익명 표 이전을 건너뛴다. */
  store: VoteStore | null;
  secret: string | null;
  anonCookieValue: string | undefined;
}

export interface AuthCallbackResult {
  redirectTo: string;
  /** `side_anon` 쿠키를 응답에서 지워야 하는지. */
  clearAnonCookie: boolean;
}

/**
 * `GET /auth/callback` 의 순수 로직. 코드 교환 → 익명 표 이전 → 되돌아갈 경로 결정.
 * 이전에 실패해도 로그인은 성공으로 다룬다(로그만 남긴다). 근거: docs/AuthSpec.md 4.1·4.3.
 */
export const handleAuthCallback = async ({
  code,
  next,
  gateway,
  store,
  secret,
  anonCookieValue,
}: AuthCallbackDeps): Promise<AuthCallbackResult> => {
  if (!code) {
    return { redirectTo: LOGIN_ERROR_PATH, clearAnonCookie: false };
  }

  const session = await gateway.exchangeCode(code);

  if (!session) {
    return { redirectTo: LOGIN_ERROR_PATH, clearAnonCookie: false };
  }

  let clearAnonCookie = false;

  if (store) {
    try {
      const migrated = await migrateAnonVotes({
        store,
        anonCookieValue,
        secret,
        userId: session.userId,
      });

      clearAnonCookie = migrated.clearCookie;
    } catch (error) {
      logServerError('익명 투표 이전 실패', error);
    }
  }

  return { redirectTo: sanitizeNextPath(next), clearAnonCookie };
};
