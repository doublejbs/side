'use client';

import { useState } from 'react';

import { LoginErrorView } from '@/components/auth/LoginErrorView';
import { OAuthButtonView } from '@/components/auth/OAuthButtonView';
import { AuthProvider } from '@/domain/AuthProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/createBrowserSupabaseClient';

import styles from './OAuthLoginContainer.module.css';

interface Props {
  /** 로그인 후 되돌아갈 내부 경로. 페이지가 이미 검증해 넘긴다. */
  next: string;
  /** 콜백이 `?error=1` 로 되돌려 보냈는지. 시작 실패와 문구가 같아 여기서 합친다. */
  hasCallbackError?: boolean;
}

const PROVIDERS: AuthProvider[] = [AuthProvider.GOOGLE, AuthProvider.KAKAO];

/** OAuth 시작만 담당하는 클라이언트 계층. 버튼 모양은 `OAuthButtonView` 가 갖는다. */
export const OAuthLoginContainer = ({ next, hasCallbackError = false }: Props) => {
  const [hasStartError, setHasStartError] = useState(false);
  // 공급자 페이지로 넘어가기 전까지 화면이 그대로 남아 있어 버튼을 연타할 수 있다.
  const [isStarting, setIsStarting] = useState(false);

  const failStart = (): void => {
    setHasStartError(true);
    // 시작에 실패했으면 다시 시도할 수 있어야 하므로 잠금을 푼다.
    setIsStarting(false);
  };

  const startLogin = async (provider: AuthProvider): Promise<void> => {
    const client = createBrowserSupabaseClient();

    if (!client) {
      failStart();

      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (error) {
        failStart();
      }
    } catch {
      failStart();
    }
  };

  const handleSelect = (provider: AuthProvider) => {
    // 성공하면 브라우저가 공급자 페이지로 떠나므로 잠금을 그대로 둔다.
    setIsStarting(true);
    setHasStartError(false);

    void startLogin(provider);
  };

  // 콜백 오류와 시작 오류의 문구가 같으므로 한 화면에 alert 가 둘 생기지 않도록 하나로 합친다.
  const hasError = hasCallbackError || hasStartError;

  return (
    <div className={styles.buttons}>
      {PROVIDERS.map((provider) => (
        <OAuthButtonView
          key={provider}
          provider={provider}
          onSelect={handleSelect}
          isDisabled={isStarting}
        />
      ))}
      {hasError ? <LoginErrorView /> : null}
    </div>
  );
};
