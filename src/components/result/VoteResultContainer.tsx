'use client';

import { DifferentOpinionCtaView } from '@/components/result/DifferentOpinionCtaView';
import { NotVotedView } from '@/components/result/NotVotedView';
import { OpinionGroupListView } from '@/components/result/OpinionGroupListView';
import { VoteResultView } from '@/components/result/VoteResultView';
import { getTargetClaimSide } from '@/domain/claimSidePresenter';
import { computeDistributionAfterVote } from '@/domain/computeDistribution';
import type { IssueResultSummary } from '@/domain/IssueResultSummary';
import { useVote } from '@/store/useVote';

import styles from './VoteResultContainer.module.css';

interface Props {
  issue: IssueResultSummary;
}

export const VoteResultContainer = ({ issue }: Props) => {
  const { vote, isLoaded } = useVote(issue.id);

  if (!isLoaded) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  if (!vote) {
    return (
      <div className={styles.container}>
        <NotVotedView issueId={issue.id} />
      </div>
    );
  }

  const { distribution, participantCount } = computeDistributionAfterVote(
    issue.distribution,
    issue.participantCount,
    vote.choice,
  );
  const targetSide = getTargetClaimSide(vote.choice);
  const targetClaims = issue.claims.filter((claim) => claim.side === targetSide);

  return (
    <div className={styles.container}>
      <VoteResultView
        participantCount={participantCount}
        distribution={distribution}
        myChoice={vote.choice}
      />
      <DifferentOpinionCtaView
        issueId={issue.id}
        myChoice={vote.choice}
        targetClaims={targetClaims}
      />
      <OpinionGroupListView groups={issue.opinionGroups} claims={issue.claims} />
    </div>
  );
};
