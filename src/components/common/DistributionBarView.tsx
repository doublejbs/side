import type { VoteDistribution } from '@/domain/Issue';

import styles from './DistributionBarView.module.css';

interface Props {
  distribution: VoteDistribution;
  height?: number;
}

const getDistributionLabel = (distribution: VoteDistribution): string =>
  `찬성 ${distribution.agree}%, 반대 ${distribution.disagree}%, 모르겠음 ${distribution.unsure}%`;

export const DistributionBarView = ({ distribution, height = 10 }: Props) => (
  <div
    className={styles.bar}
    style={{ height }}
    role="img"
    aria-label={getDistributionLabel(distribution)}
  >
    <span className={`${styles.segment} ${styles.agree}`} style={{ width: `${distribution.agree}%` }} />
    <span
      className={`${styles.segment} ${styles.disagree}`}
      style={{ width: `${distribution.disagree}%` }}
    />
    <span
      className={`${styles.segment} ${styles.unsure}`}
      style={{ width: `${distribution.unsure}%` }}
    />
  </div>
);
