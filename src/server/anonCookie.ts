import { verifyCookieValue } from '@/server/signedCookie';

/**
 * 익명 투표자 식별 쿠키 이름. 로그인 도입 이후 신규 발급은 하지 않고,
 * 첫 로그인 때 계정으로 이전(docs/AuthSpec.md 4.3)하기 위해 읽기만 한다.
 */
export const ANON_COOKIE_NAME = 'side_anon';

/** 서명된 익명 식별자 쿠키 값을 검증한다. 값이 없거나 서명이 맞지 않으면 null 이다. */
export const verifyAnonId = (signedValue: string | undefined, secret: string): string | null =>
  verifyCookieValue(signedValue, secret);

/** 쿠키 서명용 비밀키. 설정되지 않았으면 익명 표를 검증할 수 없으므로 null 이다. */
export const getAnonCookieSecret = (): string | null => process.env.ANON_COOKIE_SECRET ?? null;
