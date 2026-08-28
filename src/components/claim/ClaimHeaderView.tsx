import { ChipView } from '@/components/common/ChipView';
import { getClaimSideChipTone } from '@/components/common/claimSideChipTone';
import { getClaimSideLabel } from '@/domain/claimSidePresenter';
import type { Claim } from '@/domain/Issue';

import styles from './ClaimHeaderView.module.css';

interface Props {
  claim: Claim;
}

export const ClaimHeaderView = ({ claim }: Props) => (
  <section className={styles.header}>
    <div className={styles.sideRow}>
      <ChipView tone={getClaimSideChipTone(claim.side)}>
        {`${getClaimSideLabel(claim.side)} 주장`}
      </ChipView>
    </div>

    <h1 className={styles.title}>{claim.title}</h1>

    <p className={styles.description}>{claim.description}</p>

    <p className={styles.meta}>
      설득됐어요 {claim.persuadedCount.toLocaleString('ko-KR')} · 근거 {claim.evidences.length}개
    </p>
  </section>
);
