import type { ReactNode } from 'react';

import { ClaimSide } from '@/domain/ClaimSide';

import styles from './SectionTitleView.module.css';

interface Props {
  children: ReactNode;
  dot?: ClaimSide;
  description?: string;
}

const DOT_CLASS: Record<ClaimSide, string> = {
  [ClaimSide.AGREE]: styles.agree,
  [ClaimSide.DISAGREE]: styles.disagree,
};

export const SectionTitleView = ({ children, dot, description }: Props) => (
  <div className={styles.section}>
    <div className={styles.titleRow}>
      {dot ? <span className={`${styles.dot} ${DOT_CLASS[dot]}`} /> : null}
      <h2 className={styles.title}>{children}</h2>
    </div>
    {description ? <p className={styles.description}>{description}</p> : null}
  </div>
);
