import { GoogleMarkIcon } from '@/components/auth/GoogleMarkIcon';
import { KakaoMarkIcon } from '@/components/auth/KakaoMarkIcon';
import { joinClassNames } from '@/components/common/joinClassNames';
import { AuthProvider } from '@/domain/AuthProvider';

import styles from './OAuthButtonView.module.css';

interface Props {
  provider: AuthProvider;
  onSelect: (provider: AuthProvider) => void;
  /** 로그인을 시작할 수 없거나(환경 변수 없음), 이미 시작해 연타를 막아야 할 때. */
  isDisabled?: boolean;
}

const LABEL: Record<AuthProvider, string> = {
  [AuthProvider.GOOGLE]: 'Google로 계속하기',
  [AuthProvider.KAKAO]: '카카오로 계속하기',
};

const PROVIDER_CLASS: Record<AuthProvider, string> = {
  [AuthProvider.GOOGLE]: styles.google,
  [AuthProvider.KAKAO]: styles.kakao,
};

/** 두 공급자 버튼은 항상 같은 크기(52px)로, 색만 브랜드 가이드를 따른다. */
export const OAuthButtonView = ({ provider, onSelect, isDisabled = false }: Props) => {
  const handleClick = () => {
    onSelect(provider);
  };

  return (
    <button
      type="button"
      className={joinClassNames(styles.button, PROVIDER_CLASS[provider])}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {provider === AuthProvider.GOOGLE ? <GoogleMarkIcon /> : <KakaoMarkIcon />}
      <span>{LABEL[provider]}</span>
    </button>
  );
};
