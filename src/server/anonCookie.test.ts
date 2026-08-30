import { describe, expect, it } from 'vitest';

import { ANON_COOKIE_NAME, verifyAnonId } from '@/server/anonCookie';
import { signCookieValue } from '@/server/signedCookie';

const SECRET = 'test-secret';

describe('verifyAnonId', () => {
  it('서명이 유효하면 익명 식별자를 돌려준다', () => {
    expect(verifyAnonId(signCookieValue('anon-1', SECRET), SECRET)).toBe('anon-1');
  });

  it('값이 없으면 null 이다', () => {
    expect(verifyAnonId(undefined, SECRET)).toBeNull();
  });

  it('서명이 위조되면 null 이다', () => {
    expect(verifyAnonId(signCookieValue('anon-1', 'other-secret'), SECRET)).toBeNull();
  });
});

describe('ANON_COOKIE_NAME', () => {
  it('기존 익명 쿠키 이름을 유지한다', () => {
    expect(ANON_COOKIE_NAME).toBe('side_anon');
  });
});
