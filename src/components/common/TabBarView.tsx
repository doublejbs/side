'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

import type { IconProps } from '@/components/common/icons/IconProps';
import { CompassIcon } from '@/components/common/icons/CompassIcon';
import { ListIcon } from '@/components/common/icons/ListIcon';
import { PersonIcon } from '@/components/common/icons/PersonIcon';

import styles from './TabBarView.module.css';

interface TabItem {
  href: string;
  label: string;
  Icon: (props: IconProps) => ReactElement;
}

const TAB_ITEMS: TabItem[] = [
  { href: '/', label: '이슈', Icon: ListIcon },
  { href: '/discover', label: '발견', Icon: CompassIcon },
  { href: '/me', label: '나', Icon: PersonIcon },
];

/** 관리자 화면(`/admin/**`)은 앱 하단 탭바를 사용하지 않는다. */
const HIDDEN_PATH_PREFIX = '/admin';

const isHiddenPath = (pathname: string): boolean =>
  pathname === HIDDEN_PATH_PREFIX || pathname.startsWith(`${HIDDEN_PATH_PREFIX}/`);

const isActiveTab = (pathname: string, href: string): boolean => {
  if (href === '/') {
    return pathname === '/' || pathname.startsWith('/issues');
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export const TabBarView = () => {
  const pathname = usePathname() ?? '/';

  if (isHiddenPath(pathname)) {
    return null;
  }

  return (
    <nav className={styles.tabBar} aria-label="주요 메뉴">
      {TAB_ITEMS.map(({ href, label, Icon }) => {
        const isActive = isActiveTab(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} />
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
