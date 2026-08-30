import { NextResponse } from 'next/server';

import { createSupabaseAuthGateway } from '@/lib/auth/AuthGateway';
import { ANON_COOKIE_NAME } from '@/server/anonCookie';
import { handleSignOut } from '@/server/handleSignOut';
import { isSameOriginRequest } from '@/server/isSameOriginRequest';

/** 교차 출처 요청에 돌려줄 안내. 본문은 화면에 쓰이지 않으므로 짧게 둔다. */
const FORBIDDEN_MESSAGE = '교차 출처 요청은 처리하지 않습니다.';

/** `POST /auth/signout` — 세션을 지우고 홈으로 보낸다. 근거: docs/AuthSpec.md 4.1. */
export const POST = async (request: Request): Promise<Response> => {
  const result = await handleSignOut({
    gateway: createSupabaseAuthGateway(),
    isSameOrigin: isSameOriginRequest(request),
  });

  if (!result.redirectTo) {
    return new Response(FORBIDDEN_MESSAGE, { status: result.status });
  }

  const response = NextResponse.redirect(new URL(result.redirectTo, request.url), result.status);

  if (result.clearAnonCookie) {
    response.cookies.delete(ANON_COOKIE_NAME);
  }

  return response;
};
