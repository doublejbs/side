import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import type { VoteDistribution } from '@/domain/Issue';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceLabel } from '@/domain/voteChoiceLabel';

import styles from './VoteResultView.module.css';

interface Props {
  participantCount: number;
  distribution: VoteDistribution;
  myChoice: VoteChoice | null;
}

interface ResultRow {
  choice: VoteChoice;
  value: number;
}

const PERCENT_CLASS: Record<VoteChoice, string> = {
  [VoteChoice.AGREE]: styles.percentAgree,
  [VoteChoice.DISAGREE]: styles.percentDisagree,
  [VoteChoice.UNSURE]: styles.percentUnsure,
};

const FILL_CLASS: Record<VoteChoice, string> = {
  [VoteChoice.AGREE]: styles.fillAgree,
  [VoteChoice.DISAGREE]: styles.fillDisagree,
  [VoteChoice.UNSURE]: styles.fillUnsure,
};

const buildRows = (distribution: VoteDistribution): ResultRow[] => [
  { choice: VoteChoice.AGREE, value: distribution.agree },
  { choice: VoteChoice.DISAGREE, value: distribution.disagree },
  { choice: VoteChoice.UNSURE, value: distribution.unsure },
];

export const VoteResultView = ({ participantCount, distribution, myChoice }: Props) => {
  const participantLabel = `${participantCount.toLocaleString('ko-KR')}명이`;
  const rows = buildRows(distribution);

  return (
    <CardView as={CardElement.SECTION} className={styles.card}>
      <h2 className={styles.title} aria-label={`${participantLabel} 의견을 남겼어요`}>
        <span className={styles.titleLine}>{participantLabel}</span>
        <span className={styles.titleLine}>의견을 남겼어요</span>
      </h2>

      <ul className={styles.rows}>
        {rows.map((row) => {
          const label = getVoteChoiceLabel(row.choice);
          const isMyChoice = row.choice === myChoice;

          return (
            <li key={row.choice} className={styles.row}>
              <div className={styles.rowHeader}>
                <span className={styles.label}>
                  <span className={styles.labelText}>{label}</span>
                  {isMyChoice ? <span className={styles.badge}>내 선택</span> : null}
                </span>
                <span className={`${styles.percent} ${PERCENT_CLASS[row.choice]}`}>
                  {row.value}%
                </span>
              </div>

              <div
                className={styles.track}
                role="progressbar"
                aria-label={`${label} ${row.value}%`}
                aria-valuenow={row.value}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  className={`${styles.fill} ${FILL_CLASS[row.choice]}`}
                  style={{ width: `${row.value}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </CardView>
  );
};
