import { LoginErrorView } from '@/components/auth/LoginErrorView';
import { OAuthLoginContainer } from '@/components/auth/OAuthLoginContainer';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { LegalConsentNoticeView } from '@/components/legal/LegalConsentNoticeView';

import styles from './LoginPageView.module.css';

interface Props {
  /** 로그인 후 되돌아갈 내부 경로. 페이지가 `sanitizeNextPath` 로 검증해 넘긴다. */
  next: string;
  /** 콜백이 `?error=1` 로 되돌려 보냈는지. */
  hasError?: boolean;
  /** Supabase 공개 환경 변수가 모두 있는지. 없으면 버튼 대신 안내만 보여준다. */
  isAuthEnabled: boolean;
}

const DESCRIPTION =
  '의견을 남기려면 로그인이 필요해요. 어떤 정치적 입장도 저장하지 않으며, 투표 기록은 나에게만 보입니다.';

export const LoginPageView = ({ next, hasError = false, isAuthEnabled }: Props) => (
  <main className={styles.page}>
    <CardView as={CardElement.SECTION} className={styles.card}>
      <h1 className={styles.logo}>SIDE</h1>
      <p className={styles.description}>{DESCRIPTION}</p>

      {/* 콜백 오류 안내는 시작 오류와 문구가 같아, 버튼이 있을 때는 컨테이너 한 곳에서만 렌더한다. */}
      {isAuthEnabled ? (
        <OAuthLoginContainer next={next} hasCallbackError={hasError} />
      ) : (
        <>
          {hasError ? <LoginErrorView /> : null}
          <p className={styles.disabled}>로그인이 설정되지 않았습니다</p>
        </>
      )}

      <LegalConsentNoticeView />
    </CardView>
  </main>
);
