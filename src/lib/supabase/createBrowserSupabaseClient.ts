'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from '@/lib/supabase/getSupabaseEnv';

let client: SupabaseClient | null = null;

/**
 * 브라우저용 Supabase 클라이언트. 환경 변수가 없으면 던지지 않고 null 을 돌려주므로
 * 호출부는 로그인 버튼을 비활성화하는 식으로 대응한다.
 */
export const createBrowserSupabaseClient = (): SupabaseClient | null => {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  if (!client) {
    client = createBrowserClient(env.url, env.anonKey, {
      // 로컬 HTTPS/HTTP 개발 서버에서도 쿠키가 붙도록 프로덕션에서만 secure 를 켠다.
      cookieOptions: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' },
    });
  }

  return client;
};
