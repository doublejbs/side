import { createServerSupabaseClient } from '@/lib/supabase/createServerSupabaseClient';
import { logServerError } from '@/server/logServerError';

/** 로그인 코드 교환 결과. 성공하면 Supabase auth.users.id 를 담는다. */
export interface ExchangedSession {
  userId: string;
}

/**
 * 서버에서 필요한 인증 동작만 추린 경계. 테스트는 `FakeAuthGateway` 로 대체한다.
 * 근거: docs/AuthSpec.md 6장.
 */
export interface AuthGateway {
  /** OAuth 콜백의 `code` 를 세션으로 바꾼다. 실패하면 null. */
  exchangeCode(code: string): Promise<ExchangedSession | null>;
  signOut(): Promise<void>;
}

/**
 * Supabase 로 구현한 게이트웨이. 환경 변수가 없으면 교환은 null, 로그아웃은 아무것도 하지 않는다
 * (인증이 꺼진 환경에서도 라우트가 500 을 내지 않도록).
 */
export const createSupabaseAuthGateway = (): AuthGateway => ({
  exchangeCode: async (code) => {
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.user) {
        return null;
      }

      return { userId: data.user.id };
    } catch (error) {
      logServerError('OAuth 코드 교환 실패', error);

      return null;
    }
  },
  signOut: async () => {
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      logServerError('로그아웃 실패', error);
    }
  },
});
