'use client';

import { ParticipationTilesView } from '@/components/me/ParticipationTilesView';
import { useMyVotes } from '@/store/useMyVotes';
import { useUserVotes } from '@/store/useUserVotes';

interface Props {
  readEvidenceCount: number;
  changedCount: number;
  /** 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준다. */
  isServerEnabled?: boolean;
}

/**
 * 투표한 이슈 수만 내 투표 기록에서 읽고 나머지는 서버가 넘긴 값을 그대로 쓴다.
 * 서버 모드에서는 `userId` 기준 서버 집계(`useMyVotes`), 목 모드에서는 localStorage 기록이다.
 * 비로그인이면 집계가 없으므로 0 이다.
 */
export const ParticipationTilesContainer = ({
  readEvidenceCount,
  changedCount,
  isServerEnabled = false,
}: Props) => {
  const { votes: myVotes } = useMyVotes();
  const localVotes = useUserVotes();
  const votedCount = isServerEnabled ? myVotes?.length ?? 0 : Object.keys(localVotes).length;

  return (
    <ParticipationTilesView
      votedCount={votedCount}
      readEvidenceCount={readEvidenceCount}
      changedCount={changedCount}
    />
  );
};
