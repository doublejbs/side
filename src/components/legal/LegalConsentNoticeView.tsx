import Link from 'next/link';

import { PRIVACY_PATH, TERMS_PATH } from '@/components/legal/legalPaths';

import styles from './LegalConsentNoticeView.module.css';

/** 로그인 화면 하단 동의 안내. 별도 체크박스 없이 로그인 행위를 동의로 갈음한다. */
export const LegalConsentNoticeView = () => (
  <p className={styles.notice}>
    계속하면{' '}
    <Link className={styles.link} href={TERMS_PATH}>
      이용약관
    </Link>
    과{' '}
    <Link className={styles.link} href={PRIVACY_PATH}>
      개인정보처리방침
    </Link>
    에 동의하는 것으로 간주됩니다.
  </p>
);
