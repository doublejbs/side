'use client';

import { SimilarGroupView } from '@/components/discover/SimilarGroupView';
import type { OpinionGroupSummary } from '@/domain/OpinionGroupSummary';
import { useUserVotes } from '@/store/useUserVotes';

interface Props {
  group: OpinionGroupSummary;
}

export const SimilarGroupContainer = ({ group }: Props) => {
  const votes = useUserVotes();

  return <SimilarGroupView group={group} votedCount={Object.keys(votes).length} />;
};
