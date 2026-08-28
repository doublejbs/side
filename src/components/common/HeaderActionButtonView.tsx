import type { ReactNode } from 'react';

import styles from './HeaderActionButtonView.module.css';

interface Props {
  label: string;
  children: ReactNode;
}

/** MVP 범위에서 동작하지 않는 헤더 액션(검색·설정)을 자리만 잡아 보여준다. */
export const HeaderActionButtonView = ({ label, children }: Props) => (
  <button type="button" className={styles.button} aria-label={label} disabled>
    {children}
  </button>
);
