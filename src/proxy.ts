import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { updateSupabaseSession } from '@/lib/supabase/updateSupabaseSession';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/server/adminSession';

const LOGIN_PATH = '/admin/login';

const ADMIN_PATH_PREFIX = '/admin';

/** Supabase 가 갱신한 쿠키를 잃지 않도록 리다이렉트 응답에 그대로 옮겨 담는다. */
const toRedirect = (url: URL, sessionResponse: NextResponse): NextResponse => {
  const redirect = NextResponse.redirect(url);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });

  return redirect;
};

/**
 * 매 요청 Supabase 세션을 갱신한 뒤(만료 토큰 리프레시) `/admin/**` 을 보호한다.
 * 관리자 로그인 페이지만 열어 두고, 세션 쿠키가 없거나 만료·위조면 로그인으로 보낸다.
 * `ANON_COOKIE_SECRET` 이 없으면 세션을 검증할 수 없으므로 모두 로그인으로 보낸다.
 * 근거: docs/PipelineSpec.md 5장 · docs/AuthSpec.md 1장. Next 16 에서 middleware 는 proxy 로 이름이 바뀌었다.
 */
export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  const sessionResponse = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;

  if (pathname !== ADMIN_PATH_PREFIX && !pathname.startsWith(`${ADMIN_PATH_PREFIX}/`)) {
    return sessionResponse;
  }

  if (pathname === LOGIN_PATH) {
    return sessionResponse;
  }

  const secret = process.env.ANON_COOKIE_SECRET;
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (secret && verifyAdminSession(cookie, secret)) {
    return sessionResponse;
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);

  loginUrl.searchParams.set('next', pathname);

  return toRedirect(loginUrl, sessionResponse);
};

/**
 * 정적 자산(확장자가 있는 파일)까지 프록시를 태우면 요청마다 Supabase 세션 갱신이 붙는다.
 * 이미지·아이콘·robots 류는 세션과 무관하므로 matcher 에서 제외한다.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
