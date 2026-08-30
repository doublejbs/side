import Link from 'next/link';

import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';

import styles from './AdminTopBarView.module.css';

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: '검수' },
  { href: '/admin/queries', label: '키워드' },
  { href: '/admin/publishers', label: '매체' },
];

interface Props {
  logoutAction: () => Promise<void>;
}

export const AdminTopBarView = ({ logoutAction }: Props) => (
  <header className={styles.topBar}>
    <Link href="/admin" className={styles.brand}>
      SIDE 관리자
    </Link>
    <nav className={styles.nav} aria-label="관리자 메뉴">
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={styles.navLink}>
          {item.label}
        </Link>
      ))}
    </nav>
    <form action={logoutAction}>
      <AdminButtonView tone={AdminButtonTone.QUIET}>로그아웃</AdminButtonView>
    </form>
  </header>
);
