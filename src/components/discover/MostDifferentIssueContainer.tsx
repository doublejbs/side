'use client';

import { useMemo } from 'react';

import { MostDifferentIssueView } from '@/components/discover/MostDifferentIssueView';
import { pickMostDifferentIssue } from '@/components/discover/pickDiscoverIssues';
import {
  toVoteChoiceBySlug,
  toVoteChoiceBySlugFromRecords,
} from '@/components/discover/toVoteChoiceBySlug';
import type { IssueSummary } from '@/domain/IssueSummary';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { useMyVotes } from '@/store/useMyVotes';
import { useSessionUser } from '@/store/useSessionUser';
import { useUserVotes } from '@/store/useUserVotes';

import styles from './MostDifferentIssueContainer.module.css';

interface Props {
  candidates: IssueSummary[];
  /** 비로그인이라 내 투표를 쓸 수 없을 때의 로그인 경로. 서버가 계산해 넘긴다. */
  loginHref: string;
  /** 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준다. */
  isServerEnabled?: boolean;
}

/**
 * 어떤 이슈가 나와 가장 다른지는 내 투표가 있어야 정해진다.
 * 서버 모드에서는 `userId` 기준 서버 집계(`useMyVotes`)를, 목 모드에서는 localStorage 기록을 쓴다.
 */
export const MostDifferentIssueContainer = ({
  candidates,
  loginHref,
  isServerEnabled = false,
}: Props) => {
  const { user, isLoaded } = useSessionUser();
  const { votes: myVotes, isLoaded: isMyVotesLoaded } = useMyVotes(isServerEnabled);
  const localVotes = useUserVotes();
  const choiceBySlug = useMemo(
    () =>
      isServerEnabled
        ? toVoteChoiceBySlug(myVotes ?? [])
        : toVoteChoiceBySlugFromRecords(localVotes),
    [isServerEnabled, localVotes, myVotes],
  );
  const issue = useMemo(
    () => pickMostDifferentIssue(candidates, choiceBySlug),
    [candidates, choiceBySlug],
  );
  const myChoice = issue ? choiceBySlug.get(issue.slug) ?? null : null;

  // 세션은 클라이언트에서 읽는다(공개 화면 정적 렌더 유지). 판정이 끝난 뒤에만 안내로 바꾼다.
  if (isAuthEnabled() && isLoaded && !user) {
    return <MostDifferentIssueView issue={null} myChoice={null} loginHref={loginHref} />;
  }

  // 서버 집계가 오기 전에 "투표한 이슈가 없다" 고 단정하지 않는다.
  if (isServerEnabled && !isMyVotesLoaded) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  return <MostDifferentIssueView issue={issue} myChoice={myChoice} />;
};
