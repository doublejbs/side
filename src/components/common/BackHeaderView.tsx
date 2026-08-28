'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { BackIcon } from '@/components/common/icons/BackIcon';

import styles from './BackHeaderView.module.css';

interface Props {
  title?: string;
  children?: ReactNode;
}

export const BackHeaderView = ({ title, children }: Props) => {
  const router = useRouter();

  const handleBackClick = () => {
    router.back();
  };

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.backButton}
        aria-label="뒤로 가기"
        onClick={handleBackClick}
      >
        <BackIcon size={22} />
      </button>
      {title ? <span className={styles.title}>{title}</span> : null}
      {children ? <div className={styles.trailing}>{children}</div> : null}
    </header>
  );
};
