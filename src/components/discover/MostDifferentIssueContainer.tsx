'use client';

import { useMemo } from 'react';

import { MostDifferentIssueView } from '@/components/discover/MostDifferentIssueView';
import { pickMostDifferentIssue } from '@/components/discover/pickDiscoverIssues';
import type { IssueSummary } from '@/domain/IssueSummary';
import { useUserVotes } from '@/store/useUserVotes';

interface Props {
  candidates: IssueSummary[];
}

/** 어떤 이슈가 나와 가장 다른지는 localStorage 투표 기록이 있어야 정해진다. */
export const MostDifferentIssueContainer = ({ candidates }: Props) => {
  const votes = useUserVotes();
  const issue = useMemo(() => pickMostDifferentIssue(candidates, votes), [candidates, votes]);
  const myChoice = issue ? votes[issue.id]?.choice ?? null : null;

  return <MostDifferentIssueView issue={issue} myChoice={myChoice} />;
};
