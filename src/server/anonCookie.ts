import { randomUUID } from 'node:crypto';

import { signCookieValue, verifyCookieValue } from '@/server/signedCookie';

/** 익명 투표자 식별 쿠키 이름. */
export const ANON_COOKIE_NAME = 'side_anon';

/** 400일. 브라우저가 허용하는 쿠키 수명 상한이다. */
const ANON_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/** `cookies()` 가 돌려주는 스토어 중 이 모듈이 쓰는 부분만 추린 인터페이스. 테스트에서 가짜로 대체한다. */
export interface AnonCookieReader {
  get(name: string): { value: string } | undefined;
}

export interface AnonCookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
}

export interface AnonCookie {
  name: string;
  value: string;
  options: AnonCookieOptions;
}

export interface AnonIdResult {
  anonId: string;
  /** 새로 만들어 응답에 `Set-Cookie` 가 필요한지 여부. */
  isNew: boolean;
}

/**
 * 서명된 익명 식별자 쿠키를 읽는다. 쿠키가 없거나 서명이 맞지 않으면 새 식별자를 만든다.
 * 새로 만든 경우 `isNew` 가 true 이므로 호출부가 `buildAnonCookie` 로 응답 쿠키를 내려야 한다.
 */
export const readOrCreateAnonId = (cookieStore: AnonCookieReader, secret: string): AnonIdResult => {
  const anonId = verifyCookieValue(cookieStore.get(ANON_COOKIE_NAME)?.value, secret);

  if (anonId) {
    return { anonId, isNew: false };
  }

  return { anonId: randomUUID(), isNew: true };
};

/** 응답에 내려줄 익명 식별자 쿠키를 만든다. 값은 HMAC 서명된 문자열이다. */
export const buildAnonCookie = (anonId: string, secret: string): AnonCookie => ({
  name: ANON_COOKIE_NAME,
  value: signCookieValue(anonId, secret),
  options: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ANON_COOKIE_MAX_AGE,
  },
});

/** 쿠키 서명용 비밀키. 설정되지 않았으면 서버 투표를 켤 수 없으므로 null 이다. */
export const getAnonCookieSecret = (): string | null => process.env.ANON_COOKIE_SECRET ?? null;
