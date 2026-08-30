import type { ReactNode } from 'react';

import styles from './AdminPageLayoutView.module.css';

interface Props {
  children: ReactNode;
}

/**
 * 관리자 화면은 데스크톱 폭(960px)을 쓴다.
 * 앱 셸이 480px 로 감싸고 있어 뷰포트 폭으로 되돌린 뒤 다시 가운데 정렬한다.
 * 앱 셸의 탭바용 아래 여백도 여기서 상쇄한다.
 */
export const AdminPageLayoutView = ({ children }: Props) => (
  <div className={styles.root}>
    <div className={styles.inner}>{children}</div>
  </div>
);
