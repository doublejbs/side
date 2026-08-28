import Link from 'next/link';

import { CardElement } from '@/components/common/CardElement';
import { CardTone } from '@/components/common/CardTone';
import { CardView } from '@/components/common/CardView';
import { ArrowRightIcon } from '@/components/common/icons/ArrowRightIcon';
import {
  getClaimSideAnchor,
  getClaimSideLabel,
  getTargetClaimSide,
} from '@/domain/claimSidePresenter';
import type { ClaimSummary } from '@/domain/IssueResultSummary';
import { VoteChoice } from '@/domain/VoteChoice';

import styles from './DifferentOpinionCtaView.module.css';

interface Props {
  issueId: string;
  myChoice: VoteChoice;
  targetClaims: ClaimSummary[];
}

const countEvidences = (claims: ClaimSummary[]): number =>
  claims.reduce((sum, claim) => sum + claim.evidenceCount, 0);

export const DifferentOpinionCtaView = ({ issueId, myChoice, targetClaims }: Props) => {
  const targetSide = getTargetClaimSide(myChoice);
  const sideLabel = getClaimSideLabel(targetSide);
  const evidenceCount = countEvidences(targetClaims);

  return (
    <CardView as={CardElement.SECTION} tone={CardTone.BRAND} className={styles.card}>
      <h2 className={styles.title}>나와 다른 사람들은 왜 그렇게 생각할까요?</h2>
      <p className={styles.description}>
        {`${sideLabel} 의견 ${targetClaims.length}개와 근거 ${evidenceCount}개를 읽어볼 수 있어요.`}
      </p>
      <Link href={`/issues/${issueId}#${getClaimSideAnchor(targetSide)}`} className={styles.action}>
        {`${sideLabel} 의견 읽어보기`}
        <ArrowRightIcon size={14} />
      </Link>
    </CardView>
  );
};
