import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DURATION_MS,
  createAdminSessionCookie,
  isAdminConfigured,
  verifyAdminSession,
} from './adminSession';
import { signCookieValue } from './signedCookie';

const SECRET = 'admin-test-secret';

const NOW = 1_700_000_000_000;

describe('adminSession', () => {
  it('쿠키 이름은 side_admin 이다', () => {
    expect(ADMIN_COOKIE_NAME).toBe('side_admin');
  });

  it('방금 만든 세션은 유효하다', () => {
    const cookie = createAdminSessionCookie(SECRET, NOW);

    expect(verifyAdminSession(cookie, SECRET, NOW + 1000)).toBe(true);
  });

  it('12시간이 지나면 만료된다', () => {
    const cookie = createAdminSessionCookie(SECRET, NOW);

    expect(verifyAdminSession(cookie, SECRET, NOW + ADMIN_SESSION_DURATION_MS - 1)).toBe(true);
    expect(verifyAdminSession(cookie, SECRET, NOW + ADMIN_SESSION_DURATION_MS)).toBe(false);
  });

  it('다른 비밀키로 서명된 쿠키는 거부한다', () => {
    const cookie = createAdminSessionCookie('other-secret', NOW);

    expect(verifyAdminSession(cookie, SECRET, NOW)).toBe(false);
  });

  it('서명이 없거나 형식이 다르면 거부한다', () => {
    expect(verifyAdminSession(undefined, SECRET, NOW)).toBe(false);
    expect(verifyAdminSession('tampered', SECRET, NOW)).toBe(false);
    expect(verifyAdminSession(signCookieValue('anon:123', SECRET), SECRET, NOW)).toBe(false);
    expect(verifyAdminSession(signCookieValue('admin:not-a-number', SECRET), SECRET, NOW)).toBe(
      false,
    );
  });

  it('환경변수가 모두 있어야 관리자 로그인이 가능하다', () => {
    const original = { password: process.env.ADMIN_PASSWORD, secret: process.env.ANON_COOKIE_SECRET };

    delete process.env.ADMIN_PASSWORD;
    delete process.env.ANON_COOKIE_SECRET;
    expect(isAdminConfigured()).toBe(false);

    process.env.ADMIN_PASSWORD = 'pw';
    expect(isAdminConfigured()).toBe(false);

    process.env.ANON_COOKIE_SECRET = 'secret';
    expect(isAdminConfigured()).toBe(true);

    process.env.ADMIN_PASSWORD = original.password;
    process.env.ANON_COOKIE_SECRET = original.secret;

    if (!original.password) {
      delete process.env.ADMIN_PASSWORD;
    }

    if (!original.secret) {
      delete process.env.ANON_COOKIE_SECRET;
    }
  });
});
