import Link from 'next/link';

import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';

import styles from './LoginRequiredView.module.css';

interface Props {
  loginHref: string;
}

/** 로그인해야 볼 수 있는 화면(`/me`)에서 본문 대신 보여주는 안내 카드. */
export const LoginRequiredView = ({ loginHref }: Props) => (
  <CardView as={CardElement.SECTION} className={styles.card}>
    <h2 className={styles.title}>로그인하면 투표 기록과 생각의 변화를 볼 수 있어요</h2>
    <p className={styles.description}>
      어떤 정치적 입장도 저장하지 않으며, 투표 기록은 나에게만 보입니다.
    </p>
    <Link className={styles.action} href={loginHref}>
      로그인
    </Link>
  </CardView>
);
