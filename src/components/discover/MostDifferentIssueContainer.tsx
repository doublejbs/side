'use client';

import { useMemo } from 'react';

import { MostDifferentIssueView } from '@/components/discover/MostDifferentIssueView';
import { pickMostDifferentIssue } from '@/components/discover/pickDiscoverIssues';
import type { IssueSummary } from '@/domain/IssueSummary';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { useSessionUser } from '@/store/useSessionUser';
import { useUserVotes } from '@/store/useUserVotes';

interface Props {
  candidates: IssueSummary[];
  /** 비로그인이라 내 투표를 쓸 수 없을 때의 로그인 경로. 서버가 계산해 넘긴다. */
  loginHref: string;
}

/** 어떤 이슈가 나와 가장 다른지는 localStorage 투표 기록이 있어야 정해진다. */
export const MostDifferentIssueContainer = ({ candidates, loginHref }: Props) => {
  const { user, isLoaded } = useSessionUser();
  const votes = useUserVotes();
  const issue = useMemo(() => pickMostDifferentIssue(candidates, votes), [candidates, votes]);
  const myChoice = issue ? votes[issue.slug]?.choice ?? null : null;

  // 세션은 클라이언트에서 읽는다(공개 화면 정적 렌더 유지). 판정이 끝난 뒤에만 안내로 바꾼다.
  if (isAuthEnabled() && isLoaded && !user) {
    return <MostDifferentIssueView issue={null} myChoice={null} loginHref={loginHref} />;
  }

  return <MostDifferentIssueView issue={issue} myChoice={myChoice} />;
};
