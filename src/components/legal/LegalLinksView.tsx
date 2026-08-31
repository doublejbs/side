import Link from 'next/link';

import { joinClassNames } from '@/components/common/joinClassNames';
import { PRIVACY_PATH, TERMS_PATH } from '@/components/legal/legalPaths';

import styles from './LegalLinksView.module.css';

interface Props {
  className?: string;
}

/** 약관·방침으로 가는 나란한 링크 두 개. 탭바와 겹치는 푸터 대신 화면 안에 둔다. */
export const LegalLinksView = ({ className }: Props) => (
  <nav className={joinClassNames(styles.links, className)} aria-label="약관 및 정책">
    <Link className={styles.link} href={TERMS_PATH}>
      이용약관
    </Link>
    <Link className={styles.link} href={PRIVACY_PATH}>
      개인정보처리방침
    </Link>
  </nav>
);
