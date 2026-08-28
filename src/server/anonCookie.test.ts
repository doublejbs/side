import { describe, expect, it } from 'vitest';

import {
  ANON_COOKIE_NAME,
  buildAnonCookie,
  readOrCreateAnonId,
} from '@/server/anonCookie';
import type { AnonCookieReader } from '@/server/anonCookie';
import { signCookieValue, verifyCookieValue } from '@/server/signedCookie';

const SECRET = 'test-secret';

const createReader = (value: string | undefined): AnonCookieReader => ({
  get: (name: string) => (name === ANON_COOKIE_NAME && value ? { value } : undefined),
});

describe('readOrCreateAnonId', () => {
  it('서명이 유효한 쿠키가 있으면 그 식별자를 그대로 쓴다', () => {
    const reader = createReader(signCookieValue('anon-1', SECRET));

    expect(readOrCreateAnonId(reader, SECRET)).toEqual({ anonId: 'anon-1', isNew: false });
  });

  it('쿠키가 없으면 새 식별자를 만든다', () => {
    const result = readOrCreateAnonId(createReader(undefined), SECRET);

    expect(result.isNew).toBe(true);
    expect(result.anonId).toHaveLength(36);
  });

  it('서명이 위조되면 새 식별자를 만든다', () => {
    const forged = signCookieValue('anon-1', 'other-secret');

    const result = readOrCreateAnonId(createReader(forged), SECRET);

    expect(result.isNew).toBe(true);
    expect(result.anonId).not.toBe('anon-1');
  });

  it('다른 이름의 쿠키만 있으면 새 식별자를 만든다', () => {
    const reader: AnonCookieReader = { get: () => undefined };

    expect(readOrCreateAnonId(reader, SECRET).isNew).toBe(true);
  });
});

describe('buildAnonCookie', () => {
  it('서명된 값과 HttpOnly 옵션을 담은 쿠키를 만든다', () => {
    const cookie = buildAnonCookie('anon-1', SECRET);

    expect(cookie.name).toBe(ANON_COOKIE_NAME);
    expect(verifyCookieValue(cookie.value, SECRET)).toBe('anon-1');
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe('lax');
    expect(cookie.options.path).toBe('/');
    expect(cookie.options.maxAge).toBe(400 * 24 * 60 * 60);
  });

  it('개발 환경에서는 secure 를 켜지 않는다', () => {
    expect(buildAnonCookie('anon-1', SECRET).options.secure).toBe(false);
  });

  it('만든 쿠키를 다시 읽으면 같은 식별자가 나온다', () => {
    const cookie = buildAnonCookie('anon-1', SECRET);

    expect(readOrCreateAnonId(createReader(cookie.value), SECRET)).toEqual({
      anonId: 'anon-1',
      isNew: false,
    });
  });
});
