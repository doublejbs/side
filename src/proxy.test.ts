import { NextRequest } from 'next/server';

import { ADMIN_COOKIE_NAME, createAdminSessionCookie } from '@/server/adminSession';

import { proxy } from './proxy';

const SECRET = 'proxy-test-secret';

const createRequest = (pathname: string, cookie?: string): NextRequest => {
  const request = new NextRequest(new URL(`https://side.test${pathname}`));

  if (cookie) {
    request.cookies.set(ADMIN_COOKIE_NAME, cookie);
  }

  return request;
};

describe('proxy', () => {
  beforeEach(() => {
    process.env.ANON_COOKIE_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.ANON_COOKIE_SECRET;
  });

  it('관리자 밖의 경로는 그대로 통과시킨다', async () => {
    const response = await proxy(createRequest('/issues/work-week-4-5'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('로그인 페이지는 그대로 통과시킨다', async () => {
    const response = await proxy(createRequest('/admin/login'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('유효한 세션 쿠키가 있으면 통과시킨다', async () => {
    const response = await proxy(createRequest('/admin', createAdminSessionCookie(SECRET)));

    expect(response.headers.get('location')).toBeNull();
  });

  it('쿠키가 없으면 next 파라미터를 붙여 로그인으로 보낸다', async () => {
    const response = await proxy(createRequest('/admin/issues/abc'));
    const location = new URL(response.headers.get('location') ?? '');

    expect(location.pathname).toBe('/admin/login');
    expect(location.searchParams.get('next')).toBe('/admin/issues/abc');
  });

  it('만료·위조된 쿠키는 통과시키지 않는다', async () => {
    const expired = createAdminSessionCookie(SECRET, Date.now() - 13 * 60 * 60 * 1000);

    expect((await proxy(createRequest('/admin', expired))).headers.get('location')).toContain(
      '/admin/login',
    );
    expect((await proxy(createRequest('/admin', 'forged.value'))).headers.get('location')).toContain(
      '/admin/login',
    );
  });

  it('ANON_COOKIE_SECRET 이 없으면 모두 로그인으로 보낸다', async () => {
    const cookie = createAdminSessionCookie(SECRET);

    delete process.env.ANON_COOKIE_SECRET;

    expect((await proxy(createRequest('/admin', cookie))).headers.get('location')).toContain(
      '/admin/login',
    );
  });

  it('이름이 admin 으로 시작하는 다른 경로는 보호 대상이 아니다', async () => {
    const response = await proxy(createRequest('/administrators'));

    expect(response.headers.get('location')).toBeNull();
  });
});
