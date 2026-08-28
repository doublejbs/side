import { SectionTitleView } from '@/components/common/SectionTitleView';
import { ClaimCardView } from '@/components/issue/ClaimCardView';
import { getClaimSideAnchor, getClaimSideTitle } from '@/domain/claimSidePresenter';
import { ClaimSide } from '@/domain/ClaimSide';
import type { Claim } from '@/domain/Issue';

import styles from './ClaimSectionView.module.css';

interface Props {
  issueId: string;
  side: ClaimSide;
  claims: Claim[];
}

export const ClaimSectionView = ({ issueId, side, claims }: Props) => (
  <section id={getClaimSideAnchor(side)} className={styles.section}>
    <SectionTitleView dot={side}>{getClaimSideTitle(side)}</SectionTitleView>
    <div className={styles.cards}>
      {claims.map((claim) => (
        <ClaimCardView key={claim.id} issueId={issueId} claim={claim} />
      ))}
    </div>
  </section>
);
