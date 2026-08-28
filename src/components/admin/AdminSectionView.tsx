import type { ReactNode } from 'react';

import styles from './AdminSectionView.module.css';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

export const AdminSectionView = ({ title, description, children }: Props) => (
  <section className={styles.section}>
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
    <div className={styles.body}>{children}</div>
  </section>
);
