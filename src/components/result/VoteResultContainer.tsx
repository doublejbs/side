'use client';

import { SaveErrorView } from '@/components/common/SaveErrorView';
import { DifferentOpinionCtaView } from '@/components/result/DifferentOpinionCtaView';
import { NotVotedView } from '@/components/result/NotVotedView';
import { OpinionGroupListView } from '@/components/result/OpinionGroupListView';
import { VoteResultView } from '@/components/result/VoteResultView';
import { getTargetClaimSide } from '@/domain/claimSidePresenter';
import { computeDistributionAfterVote } from '@/domain/computeDistribution';
import type { VoteDistribution } from '@/domain/Issue';
import type { IssueResultSummary } from '@/domain/IssueResultSummary';
import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteResultResponse } from '@/domain/VoteApiTypes';
import { useServerVoteSync } from '@/store/useServerVoteSync';
import { useVote } from '@/store/useVote';

import styles from './VoteResultContainer.module.css';

interface Props {
  issue: IssueResultSummary;
  /** 서버 저장(DB)이 켜져 있는지. 페이지가 알려준다. */
  isServerEnabled?: boolean;
}

interface ResolvedResult {
  distribution: VoteDistribution;
  participantCount: number;
}

/**
 * 서버 모드에서는 서버가 집계한 분포를 그대로 쓴다. 아직 응답이 없으면 서버 렌더 값으로 보여준다.
 * 목 모드에서는 내 표 1개를 더한 분포를 계산한다.
 */
const resolveResult = (
  issue: IssueResultSummary,
  choice: VoteChoice,
  isServerEnabled: boolean,
  serverResult: VoteResultResponse | null,
): ResolvedResult => {
  if (!isServerEnabled) {
    return computeDistributionAfterVote(issue.distribution, issue.participantCount, choice);
  }

  if (serverResult) {
    return {
      distribution: serverResult.distribution,
      participantCount: serverResult.participantCount,
    };
  }

  return { distribution: issue.distribution, participantCount: issue.participantCount };
};

export const VoteResultContainer = ({ issue, isServerEnabled = false }: Props) => {
  const { vote, isLoaded, serverResult, error } = useVote(issue.slug, { isServerEnabled });

  useServerVoteSync(issue.slug, isServerEnabled);

  if (!isLoaded) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  if (!vote) {
    return (
      <div className={styles.container}>
        <NotVotedView issueId={issue.slug} />
      </div>
    );
  }

  const { distribution, participantCount } = resolveResult(
    issue,
    vote.choice,
    isServerEnabled,
    serverResult,
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
        issueId={issue.slug}
        myChoice={vote.choice}
        targetClaims={targetClaims}
      />
      <OpinionGroupListView groups={issue.opinionGroups} claims={issue.claims} />
      {error ? <SaveErrorView /> : null}
    </div>
  );
};
