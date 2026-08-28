import { signCookieValue, verifyCookieValue } from '@/server/signedCookie';

/** 관리자 세션 쿠키 이름. */
export const ADMIN_COOKIE_NAME = 'side_admin';

/** 세션 유효 기간 12시간. */
export const ADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

const VALUE_PREFIX = 'admin:';

/** `admin:<만료 epoch ms>` 를 서명해 쿠키 값으로 만든다. */
export const createAdminSessionCookie = (secret: string, now: number = Date.now()): string =>
  signCookieValue(`${VALUE_PREFIX}${now + ADMIN_SESSION_DURATION_MS}`, secret);

/** 서명과 만료 시각을 모두 확인한다. 위조·만료·형식 오류는 false. */
export const verifyAdminSession = (
  cookie: string | undefined,
  secret: string,
  now: number = Date.now(),
): boolean => {
  const value = verifyCookieValue(cookie, secret);

  if (!value || !value.startsWith(VALUE_PREFIX)) {
    return false;
  }

  const expiresAt = Number(value.slice(VALUE_PREFIX.length));

  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return now < expiresAt;
};

/** 관리자 로그인에 필요한 환경변수가 모두 있는지 확인한다. */
export const isAdminConfigured = (): boolean =>
  Boolean(process.env.ADMIN_PASSWORD && process.env.ANON_COOKIE_SECRET);
