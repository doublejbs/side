import { AdminBannerTone } from '@/components/admin/AdminBannerTone';
import { AdminBannerView } from '@/components/admin/AdminBannerView';
import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { AdminFormField } from '@/server/AdminFormField';

import styles from './LoginFormView.module.css';

interface Props {
  loginAction: (formData: FormData) => Promise<void>;
  nextPath: string;
  hasError: boolean;
  isConfigured: boolean;
}

export const LoginFormView = ({ loginAction, nextPath, hasError, isConfigured }: Props) => (
  <div className={styles.wrapper}>
    <h1 className={styles.title}>SIDE 관리자</h1>
    <p className={styles.description}>검수 화면에 들어가려면 비밀번호가 필요합니다.</p>

    {isConfigured ? null : (
      <AdminBannerView tone={AdminBannerTone.WARNING} title="설정 필요">
        ADMIN_PASSWORD 와 ANON_COOKIE_SECRET 환경변수를 설정한 뒤 다시 시도해 주세요.
      </AdminBannerView>
    )}

    {hasError ? (
      <AdminBannerView tone={AdminBannerTone.ERROR}>비밀번호가 올바르지 않습니다.</AdminBannerView>
    ) : null}

    <form action={loginAction} className={styles.form}>
      <input type="hidden" name={AdminFormField.NEXT} value={nextPath} />
      <label className={styles.field}>
        <span className={styles.label}>비밀번호</span>
        <input
          className={styles.input}
          type="password"
          name={AdminFormField.PASSWORD}
          autoComplete="current-password"
        />
      </label>
      <AdminButtonView tone={AdminButtonTone.PRIMARY}>로그인</AdminButtonView>
    </form>
  </div>
);
