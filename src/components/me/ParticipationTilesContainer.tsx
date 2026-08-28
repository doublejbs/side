'use client';

import { ParticipationTilesView } from '@/components/me/ParticipationTilesView';
import { useUserVotes } from '@/store/useUserVotes';

interface Props {
  readEvidenceCount: number;
  changedCount: number;
}

/** 투표한 이슈 수만 localStorage 기록에서 읽고 나머지는 서버가 넘긴 값을 그대로 쓴다. */
export const ParticipationTilesContainer = ({ readEvidenceCount, changedCount }: Props) => {
  const votes = useUserVotes();

  return (
    <ParticipationTilesView
      votedCount={Object.keys(votes).length}
      readEvidenceCount={readEvidenceCount}
      changedCount={changedCount}
    />
  );
};
