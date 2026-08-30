'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import {
  ANONYMOUS_SESSION,
  getServerSessionSnapshot,
  getSessionSnapshot,
  startSessionLoad,
  subscribeSession,
  type SessionSnapshot,
} from '@/store/SessionCache';

/**
 * 현재 로그인 사용자를 **클라이언트에서** 읽는다.
 * 페이지(서버 컴포넌트)가 세션을 읽으면 공개 화면이 전부 동적 렌더로 바뀌므로,
 * 세션 판정은 이 훅과 `GET /api/session` 으로 옮겼다. 근거: docs/AuthSpec.md 4.4.
 *
 * 로그인이 꺼진 환경(NEXT_PUBLIC 환경 변수 없음)에서는 요청하지 않고 바로 비로그인으로 확정한다.
 */
export const useSessionUser = (): SessionSnapshot => {
  const snapshot = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const isEnabled = isAuthEnabled();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    startSessionLoad();
  }, [isEnabled]);

  if (!isEnabled) {
    return ANONYMOUS_SESSION;
  }

  return snapshot;
};
