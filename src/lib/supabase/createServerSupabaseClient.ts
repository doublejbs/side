import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { getSupabaseEnv } from '@/lib/supabase/getSupabaseEnv';

/**
 * 서버 컴포넌트·라우트 핸들러 공용 Supabase 클라이언트.
 * 요청마다 새로 만들어야 하므로 캐시하지 않는다. 환경 변수가 없으면 null 이다.
 * 근거: docs/AuthSpec.md 1장.
 */
export const createServerSupabaseClient = async (): Promise<SupabaseClient | null> => {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    // 로컬 HTTPS/HTTP 개발 서버에서도 쿠키가 붙도록 프로덕션에서만 secure 를 켠다.
    cookieOptions: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 토큰 갱신은 `proxy.ts` 가 맡으므로 무시한다.
        }
      },
    },
  });
};
