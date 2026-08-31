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

/**
 * localStorage 투표 기록을 구독한다. 서버 렌더링·하이드레이션 시점에는 빈 기록을 돌려준다.
 *
 * **목 모드 전용 집계원이다.** 서버 모드(`isServerEnabled`)의 "나"·"발견" 탭은 기기마다 갈라지는
 * 이 기록 대신 `userId` 기준 서버 집계(`useMyVotes`)를 쓴다. 근거: docs/AuthSpec.md 4.4.
 */
export const useUserVotes = (): Record<string, VoteRecord> => {
  const version = useSyncExternalStore(
    subscribeUserRecord,
    getUserRecordVersion,
    getServerUserRecordVersion,
  );

  return useMemo(() => (version === 0 ? EMPTY_VOTES : getAllVotes()), [version]);
};
