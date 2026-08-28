'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteRecord } from '@/domain/UserRecord';
import {
  getServerUserRecordVersion,
  getUserRecordVersion,
  getVote,
  setVote,
  subscribeUserRecord,
} from '@/store/UserRecordStore';

interface UseVoteResult {
  vote: VoteRecord | null;
  isLoaded: boolean;
  castVote: (choice: VoteChoice) => VoteRecord;
}

export const useVote = (issueId: string): UseVoteResult => {
  const version = useSyncExternalStore(
    subscribeUserRecord,
    getUserRecordVersion,
    getServerUserRecordVersion,
  );

  const vote = useMemo(() => (version > 0 ? getVote(issueId) : null), [issueId, version]);
  const isLoaded = version > 0;

  const castVote = useCallback(
    (choice: VoteChoice): VoteRecord => setVote(issueId, choice),
    [issueId],
  );

  return { vote, isLoaded, castVote };
};
