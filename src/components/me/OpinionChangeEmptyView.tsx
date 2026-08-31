import { CardView } from '@/components/common/CardView';

import styles from './OpinionChangeEmptyView.module.css';

/** 아직 선택을 바꾼 이슈가 없을 때 자리를 지키는 카드. 근거: docs/PerspectiveSpec.md 5장. */
export const OpinionChangeEmptyView = () => (
  <CardView>
    <p className={styles.message}>생각이 바뀐 기록이 아직 없어요</p>
    <p className={styles.description}>
      같은 이슈에 다시 투표해 선택이 달라지면 여기에 남습니다.
    </p>
  </CardView>
);
