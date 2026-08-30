import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/server/adminSession';

const LOGIN_PATH = '/admin/login';

/**
 * `/admin/**` 보호. 로그인 페이지만 열어 두고, 세션 쿠키가 없거나 만료·위조면 로그인으로 보낸다.
 * `ANON_COOKIE_SECRET` 이 없으면 세션을 검증할 수 없으므로 모두 로그인으로 보낸다.
 * 근거: docs/PipelineSpec.md 5장. Next 16 에서 middleware 는 proxy 로 이름이 바뀌었다.
 */
export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  const secret = process.env.ANON_COOKIE_SECRET;
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (secret && verifyAdminSession(cookie, secret)) {
    return NextResponse.next();
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);

  loginUrl.searchParams.set('next', pathname);

  return NextResponse.redirect(loginUrl);
};

export const config = {
  matcher: ['/admin/:path*'],
};
