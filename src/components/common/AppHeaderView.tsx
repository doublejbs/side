import type { ReactNode } from 'react';

import styles from './AppHeaderView.module.css';

interface Props {
  action?: ReactNode;
}

/** 탭 최상단 헤더. 로고 우측에 선택적인 액션 슬롯을 둔다. */
export const AppHeaderView = ({ action }: Props) => (
  <header className={styles.header}>
    <span className={styles.logo}>SIDE</span>
    {action ?? null}
  </header>
);
