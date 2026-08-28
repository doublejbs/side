import type { ReactNode } from 'react';

import { TabBarView } from '@/components/common/TabBarView';

import styles from './AppShellView.module.css';

interface Props {
  children: ReactNode;
}

export const AppShellView = ({ children }: Props) => (
  <div className={styles.shell}>
    <div className={styles.content}>{children}</div>
    <TabBarView />
  </div>
);
