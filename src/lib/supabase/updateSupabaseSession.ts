import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSupabaseEnv } from '@/lib/supabase/getSupabaseEnv';
import { logServerError } from '@/server/logServerError';

/**
 * 매 요청 Supabase 세션을 갱신한다(만료 토큰 리프레시).
 * `@supabase/ssr` 미들웨어 패턴: 요청 쿠키를 읽어 `getUser()` 를 부르고,
 * 갱신된 쿠키를 요청과 응답 양쪽에 다시 쓴다.
 * 환경 변수가 없으면 아무것도 하지 않고 그대로 통과시킨다. 근거: docs/AuthSpec.md 1장.
 */
export const updateSupabaseSession = async (request: NextRequest): Promise<NextResponse> => {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();

  if (!env) {
    return response;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch (error) {
    // Supabase 에 닿지 못해도 요청 자체는 계속 처리한다(비로그인으로 다룬다).
    logServerError('Supabase 세션 갱신 실패', error);
  }

  return response;
};
