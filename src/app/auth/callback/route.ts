import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createSupabaseAuthGateway } from '@/lib/auth/AuthGateway';
import { ANON_COOKIE_NAME } from '@/server/anonCookie';
import { handleAuthCallback } from '@/server/handleAuthCallback';
import { getServerVoteContext } from '@/server/isServerVoteEnabled';

/** `GET /auth/callback?code=&next=` — OAuth 코드를 세션으로 바꾸고 익명 표를 계정으로 옮긴다. */
export const GET = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const context = getServerVoteContext();
  const cookieStore = await cookies();
  const result = await handleAuthCallback({
    code: url.searchParams.get('code'),
    next: url.searchParams.get('next'),
    gateway: createSupabaseAuthGateway(),
    store: context?.store ?? null,
    secret: context?.secret ?? null,
    anonCookieValue: cookieStore.get(ANON_COOKIE_NAME)?.value,
  });
  const response = NextResponse.redirect(new URL(result.redirectTo, url.origin));

  if (result.clearAnonCookie) {
    response.cookies.delete(ANON_COOKIE_NAME);
  }

  return response;
};
