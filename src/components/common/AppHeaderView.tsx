import type { ReactNode } from 'react';

import styles from './AppHeaderView.module.css';

interface Props {
  action?: ReactNode;
  /** 로그인·프로필 진입점(`AuthActionView`). 검색·설정 액션 오른쪽에 둔다. */
  authAction?: ReactNode;
}

/** 탭 최상단 헤더. 로고 우측에 선택적인 액션 슬롯을 둔다. */
export const AppHeaderView = ({ action, authAction }: Props) => (
  <header className={styles.header}>
    <span className={styles.logo}>SIDE</span>
    {action || authAction ? (
      <div className={styles.actions}>
        {action}
        {authAction}
      </div>
    ) : null}
  </header>
);
