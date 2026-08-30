'use client';

import { AuthActionView } from '@/components/auth/AuthActionView';
import { useSessionUser } from '@/store/useSessionUser';

import styles from './AuthActionContainer.module.css';

interface Props {
  /** 비로그인일 때 이동할 로그인 경로(`?next=` 포함). 서버가 탭 경로로 계산해 넘긴다. */
  loginHref: string;
}

/**
 * 헤더 액션 슬롯을 클라이언트에서 세션을 읽어 렌더한다.
 * 페이지가 세션을 읽으면 공개 화면이 동적 렌더로 바뀌므로 판정을 여기로 옮겼다.
 * 세션을 받아오기 전에는 같은 크기의 자리만 잡아 로고·검색 버튼이 흔들리지 않게 한다.
 * 근거: docs/AuthSpec.md 4.4.
 */
export const AuthActionContainer = ({ loginHref }: Props) => {
  const { user, isLoaded } = useSessionUser();

  if (!isLoaded) {
    return <span className={styles.placeholder} aria-busy="true" />;
  }

  return <AuthActionView user={user} loginHref={loginHref} />;
};
