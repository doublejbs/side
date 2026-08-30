import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';

import styles from './LoginToVoteView.module.css';

interface Props {
  loginHref: string;
}

/** 비로그인 상태에서 결과만 본 사람에게 투표를 권하는 카드. 분포는 로그인 없이도 볼 수 있다. */
export const LoginToVoteView = ({ loginHref }: Props) => (
  <CardView as={CardElement.SECTION} className={styles.card}>
    <h2 className={styles.title}>내 선택은 로그인 후에 남길 수 있어요</h2>
    <p className={styles.description}>
      투표하면 내 선택이 분포에 반영되고, 비슷한 생각을 가진 사람들을 볼 수 있어요.
    </p>
    <ArrowLinkView className={styles.action} href={loginHref}>
      로그인하고 투표하기
    </ArrowLinkView>
  </CardView>
);
