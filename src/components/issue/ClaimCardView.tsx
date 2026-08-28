import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { ChipView } from '@/components/common/ChipView';
import { getClaimSideChipTone } from '@/components/common/claimSideChipTone';
import type { Claim } from '@/domain/Issue';

import styles from './ClaimCardView.module.css';

interface Props {
  issueId: string;
  claim: Claim;
}

export const ClaimCardView = ({ issueId, claim }: Props) => (
  <CardView as={CardElement.ARTICLE} className={styles.card}>
    <h3 className={styles.title}>{claim.title}</h3>
    <p className={styles.description}>{claim.description}</p>
    <div className={styles.footer}>
      <ChipView>근거 {claim.evidences.length}개</ChipView>
      <ChipView tone={getClaimSideChipTone(claim.side)}>
        설득됐어요 {claim.persuadedCount.toLocaleString('ko-KR')}
      </ChipView>
      <ArrowLinkView
        className={styles.evidenceLink}
        href={`/issues/${issueId}/claims/${claim.id}`}
      >
        근거 보기
      </ArrowLinkView>
    </div>
  </CardView>
);
