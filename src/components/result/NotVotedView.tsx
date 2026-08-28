import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';

import styles from './NotVotedView.module.css';

interface Props {
  issueId: string;
}

export const NotVotedView = ({ issueId }: Props) => (
  <CardView as={CardElement.SECTION} className={styles.card}>
    <h2 className={styles.title}>아직 이 이슈에 의견을 남기지 않았어요</h2>
    <p className={styles.description}>
      투표를 하면 전체 분포와 비슷한 생각을 가진 사람들을 함께 볼 수 있어요.
    </p>
    <ArrowLinkView className={styles.action} href={`/issues/${issueId}#vote`}>
      의견 남기기
    </ArrowLinkView>
  </CardView>
);
