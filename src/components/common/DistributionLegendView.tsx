import type { VoteDistribution } from '@/domain/Issue';

import styles from './DistributionLegendView.module.css';

interface Props {
  distribution: VoteDistribution;
  colored?: boolean;
}

export const DistributionLegendView = ({ distribution, colored = false }: Props) => {
  const items = [
    { label: '찬성', value: distribution.agree, colorClass: styles.coloredAgree },
    { label: '반대', value: distribution.disagree, colorClass: styles.coloredDisagree },
    { label: '모르겠음', value: distribution.unsure, colorClass: styles.coloredUnsure },
  ];

  return (
    <div className={styles.legend}>
      {items.map((item) => (
        <span
          key={item.label}
          className={`${styles.item} ${colored ? item.colorClass : ''}`}
        >
          {item.label} {item.value}%
        </span>
      ))}
    </div>
  );
};
