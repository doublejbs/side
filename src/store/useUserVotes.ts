'use client';

import { useMemo, useSyncExternalStore } from 'react';

import type { VoteRecord } from '@/domain/UserRecord';
import {
  getAllVotes,
  getServerUserRecordVersion,
  getUserRecordVersion,
  subscribeUserRecord,
} from '@/store/UserRecordStore';

const EMPTY_VOTES: Record<string, VoteRecord> = {};

/** localStorage 투표 기록을 구독한다. 서버 렌더링·하이드레이션 시점에는 빈 기록을 돌려준다. */
export const useUserVotes = (): Record<string, VoteRecord> => {
  const version = useSyncExternalStore(
    subscribeUserRecord,
    getUserRecordVersion,
    getServerUserRecordVersion,
  );

  return useMemo(() => (version === 0 ? EMPTY_VOTES : getAllVotes()), [version]);
};
