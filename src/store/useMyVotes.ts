'use client';

import { useEffect, useSyncExternalStore } from 'react';

import {
  ANONYMOUS_MY_VOTES,
  getMyVotesSnapshot,
  getServerMyVotesSnapshot,
  PENDING_MY_VOTES,
  startMyVotesLoad,
  subscribeMyVotes,
  type MyVotesSnapshot,
} from '@/store/MyVotesCache';
import { useSessionUser } from '@/store/useSessionUser';

/**
 * 서버가 `userId` 로 집계한 내 투표 목록을 **클라이언트에서** 읽는다.
 * 페이지(서버 컴포넌트)가 세션을 읽으면 공개 화면이 전부 동적 렌더로 바뀌므로,
 * 집계도 이 훅과 `GET /api/me/votes` 로 옮겼다. 근거: docs/AuthSpec.md 4.4.
 *
 * 서버 저장이 켜져 있고(`isServerEnabled`) 세션이 **로그인 상태로 확인된 뒤에만** 조회한다.
 * 목 모드·비로그인·로그인이 꺼진 환경에서는 요청 없이 `{ votes: null, isLoaded: true }` 다.
 *
 * @param isServerEnabled 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준 값을 그대로 넘긴다.
 */
export const useMyVotes = (isServerEnabled: boolean): MyVotesSnapshot => {
  const snapshot = useSyncExternalStore(
    subscribeMyVotes,
    getMyVotesSnapshot,
    getServerMyVotesSnapshot,
  );
  const { user, isLoaded: isSessionLoaded } = useSessionUser();
  const isSignedIn = user !== null;

  useEffect(() => {
    if (!isServerEnabled || !isSignedIn) {
      return;
    }

    startMyVotesLoad();
  }, [isServerEnabled, isSignedIn]);

  if (!isServerEnabled) {
    return ANONYMOUS_MY_VOTES;
  }

  if (!isSessionLoaded) {
    return PENDING_MY_VOTES;
  }

  if (!isSignedIn) {
    return ANONYMOUS_MY_VOTES;
  }

  return snapshot;
};
