import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { ArrowRightIcon } from '@/components/common/icons/ArrowRightIcon';
import { formatMonthsAgo } from '@/components/me/formatMonthsAgo';
import type { OpinionChange } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceLabel } from '@/domain/voteChoiceLabel';

import styles from './OpinionChangeView.module.css';

interface Props {
  change: OpinionChange;
  /** 이슈 질문. 카드에 쓰는 값만 받아 클라이언트로 이슈 전체를 넘기지 않는다. */
  question: string;
  persuadedClaimTitle: string;
}

const CHOICE_CLASS: Record<VoteChoice, string> = {
  [VoteChoice.AGREE]: styles.agree,
  [VoteChoice.DISAGREE]: styles.disagree,
  [VoteChoice.UNSURE]: styles.unsure,
};

const PERSUADED_PREFIX = '내가 "설득됐어요"라고 평가한 주장 — ';

export const OpinionChangeView = ({ change, question, persuadedClaimTitle }: Props) => (
  <CardView as={CardElement.ARTICLE} className={styles.card}>
    <h3 className={styles.question}>{question}</h3>
    <div className={styles.changeRow}>
      <div className={`${styles.state} ${CHOICE_CLASS[change.before.choice]}`}>
        <span className={styles.stateTime}>
          {formatMonthsAgo(change.before.votedAt, change.after.votedAt)}
        </span>
        <span className={styles.stateChoice}>{getVoteChoiceLabel(change.before.choice)}</span>
      </div>
      <span className={styles.arrow}>
        <ArrowRightIcon size={20} color="var(--color-muted-2)" />
      </span>
      <div className={`${styles.state} ${CHOICE_CLASS[change.after.choice]}`}>
        <span className={styles.stateTime}>현재</span>
        <span className={styles.stateChoice}>{getVoteChoiceLabel(change.after.choice)}</span>
      </div>
    </div>
    <div className={styles.reason}>
      <span className={styles.reasonTitle}>무엇이 생각을 바꿨나요?</span>
      <p className={styles.reasonBody}>
        {PERSUADED_PREFIX}
        {persuadedClaimTitle}
      </p>
    </div>
  </CardView>
);
