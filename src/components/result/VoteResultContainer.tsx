'use client';

import { SaveErrorView } from '@/components/common/SaveErrorView';
import { DifferentOpinionCtaView } from '@/components/result/DifferentOpinionCtaView';
import { LoginToVoteView } from '@/components/result/LoginToVoteView';
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
import { useSessionUser } from '@/store/useSessionUser';
import { useVote } from '@/store/useVote';

import styles from './VoteResultContainer.module.css';

interface Props {
  issue: IssueResultSummary;
  /** 서버 저장(DB)이 켜져 있는지. 페이지가 알려준다. */
  isServerEnabled?: boolean;
  /** 비로그인일 때 이동할 로그인 경로(`?next=` 포함). 서버가 slug 로 계산해 넘긴다. */
  loginHref?: string;
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

export const VoteResultContainer = ({
  issue,
  isServerEnabled = false,
  loginHref = '/login',
}: Props) => {
  const { user, isLoaded: isSessionLoaded } = useSessionUser();
  const { vote, isLoaded, serverResult, error, isLoginRequired } = useVote(issue.slug, {
    isServerEnabled,
  });

  useServerVoteSync(issue.slug, isServerEnabled);

  /** 목 모드는 로그인 없이도 내 선택을 보여준다(개발 편의). */
  const canVote = !isServerEnabled || (user !== null && !isLoginRequired);

  // 세션은 클라이언트에서 읽으므로(공개 화면 정적 렌더 유지) 판정 전에는 결론을 내지 않는다.
  if (isServerEnabled && !isSessionLoaded) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  /** 비로그인이어도 분포는 볼 수 있다. "내 선택" 없이 분포와 로그인 링크만 보여준다. */
  if (!canVote) {
    return (
      <div className={styles.container}>
        <VoteResultView
          participantCount={serverResult?.participantCount ?? issue.participantCount}
          distribution={serverResult?.distribution ?? issue.distribution}
          myChoice={null}
        />
        <LoginToVoteView loginHref={loginHref} />
      </div>
    );
  }

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
