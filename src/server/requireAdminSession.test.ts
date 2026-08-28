import { ADMIN_SESSION_DURATION_MS, createAdminSessionCookie } from './adminSession';
import { hasValidAdminSession } from './requireAdminSession';
import { signCookieValue } from './signedCookie';

const SECRET = 'admin-test-secret';

const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('hasValidAdminSession', () => {
  it('방금 발급한 쿠키는 통과시킨다', () => {
    const cookie = createAdminSessionCookie(SECRET, NOW.getTime());

    expect(hasValidAdminSession(cookie, SECRET, NOW)).toBe(true);
  });

  it('만료된 쿠키는 거부한다', () => {
    const cookie = createAdminSessionCookie(SECRET, NOW.getTime());
    const expired = new Date(NOW.getTime() + ADMIN_SESSION_DURATION_MS);

    expect(hasValidAdminSession(cookie, SECRET, expired)).toBe(false);
  });

  it('다른 비밀키로 서명했거나 위조된 쿠키는 거부한다', () => {
    expect(hasValidAdminSession(createAdminSessionCookie('other', NOW.getTime()), SECRET, NOW)).toBe(
      false,
    );
    expect(hasValidAdminSession('tampered', SECRET, NOW)).toBe(false);
    expect(hasValidAdminSession(signCookieValue('anon:123', SECRET), SECRET, NOW)).toBe(false);
  });

  it('쿠키가 없거나 비밀키가 없으면 거부한다', () => {
    expect(hasValidAdminSession(undefined, SECRET, NOW)).toBe(false);
    expect(hasValidAdminSession(createAdminSessionCookie(SECRET, NOW.getTime()), '', NOW)).toBe(
      false,
    );
  });
});
