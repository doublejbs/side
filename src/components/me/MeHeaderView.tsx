import { AuthActionContainer } from '@/components/auth/AuthActionContainer';
import { AppHeaderView } from '@/components/common/AppHeaderView';
import { HeaderActionButtonView } from '@/components/common/HeaderActionButtonView';
import { SettingsIcon } from '@/components/common/icons/SettingsIcon';

interface Props {
  /** Supabase 공개 환경 변수가 모두 있는지. 없으면 로그인 액션을 감춘다. */
  isAuthEnabled: boolean;
  loginHref: string;
}

/** `/me` 헤더. 로그인 여부와 무관하게 같은 구성을 쓰도록 한 곳에 모은다. */
export const MeHeaderView = ({ isAuthEnabled, loginHref }: Props) => (
  <AppHeaderView
    action={
      <HeaderActionButtonView label="설정">
        <SettingsIcon size={20} />
      </HeaderActionButtonView>
    }
    authAction={isAuthEnabled ? <AuthActionContainer loginHref={loginHref} /> : null}
  />
);
