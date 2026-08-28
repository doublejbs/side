import type { ReactNode } from 'react';

import { AdminBannerTone } from '@/components/admin/AdminBannerTone';
import { joinClassNames } from '@/components/common/joinClassNames';

import styles from './AdminBannerView.module.css';

interface Props {
  children: ReactNode;
  tone?: AdminBannerTone;
  title?: string;
}

const TONE_CLASS: Record<AdminBannerTone, string> = {
  [AdminBannerTone.INFO]: styles.info,
  [AdminBannerTone.SUCCESS]: styles.success,
  [AdminBannerTone.WARNING]: styles.warning,
  [AdminBannerTone.ERROR]: styles.error,
};

export const AdminBannerView = ({ children, tone = AdminBannerTone.INFO, title }: Props) => (
  <div className={joinClassNames(styles.banner, TONE_CLASS[tone])} role="status">
    {title ? <strong className={styles.title}>{title}</strong> : null}
    <span className={styles.text}>{children}</span>
  </div>
);
