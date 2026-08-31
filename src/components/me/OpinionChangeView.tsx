import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { ArrowRightIcon } from '@/components/common/icons/ArrowRightIcon';
import { formatMonthsAgo } from '@/components/me/formatMonthsAgo';
import type { MyOpinionChange } from '@/domain/MyPerspective';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceLabel } from '@/domain/voteChoiceLabel';

import styles from './OpinionChangeView.module.css';

interface Props {
  /** 이슈 질문과 설득 주장 제목까지 담은 변화 한 건. 서버 계산과 목 데이터가 같은 모양을 쓴다. */
  change: MyOpinionChange;
}

const CHOICE_CLASS: Record<VoteChoice, string> = {
  [VoteChoice.AGREE]: styles.agree,
  [VoteChoice.DISAGREE]: styles.disagree,
  [VoteChoice.UNSURE]: styles.unsure,
};

const PERSUADED_PREFIX = '내가 "설득됐어요"라고 평가한 주장 — ';

export const OpinionChangeView = ({ change }: Props) => (
  <CardView as={CardElement.ARTICLE} className={styles.card}>
    <h3 className={styles.question}>{change.question}</h3>
    <div className={styles.changeRow}>
      <div className={`${styles.state} ${CHOICE_CLASS[change.before]}`}>
        <span className={styles.stateTime}>{formatMonthsAgo(change.beforeAt, change.afterAt)}</span>
        <span className={styles.stateChoice}>{getVoteChoiceLabel(change.before)}</span>
      </div>
      <span className={styles.arrow}>
        <ArrowRightIcon size={20} color="var(--color-muted-2)" />
      </span>
      <div className={`${styles.state} ${CHOICE_CLASS[change.after]}`}>
        <span className={styles.stateTime}>현재</span>
        <span className={styles.stateChoice}>{getVoteChoiceLabel(change.after)}</span>
      </div>
    </div>
    {/* 설득된 주장이 없으면 무엇이 바꿨는지 지어내지 않고 블록 자체를 뺀다. */}
    {change.persuadedClaimTitle === null ? null : (
      <div className={styles.reason}>
        <span className={styles.reasonTitle}>무엇이 생각을 바꿨나요?</span>
        <p className={styles.reasonBody}>
          {PERSUADED_PREFIX}
          {change.persuadedClaimTitle}
        </p>
      </div>
    )}
  </CardView>
);
