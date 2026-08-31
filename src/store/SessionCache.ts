import type { SessionUser } from '@/domain/SessionUser';

/** 세션 조회 결과. 로드 전에는 `isLoaded === false` 라 화면이 판단을 미룬다. */
export interface SessionSnapshot {
  user: SessionUser | null;
  isLoaded: boolean;
}

const SESSION_PATH = '/api/session';

/**
 * 아직 세션을 모를 때의 스냅샷. `useSyncExternalStore` 가 매번 같은 참조를 받아야 하므로
 * 새 객체를 만들지 않고 이 상수를 그대로 돌려준다.
 */
const PENDING: SessionSnapshot = { user: null, isLoaded: false };

/** 로그인이 꺼진 환경(공개 환경 변수 없음)에서 쓰는 확정 스냅샷. */
export const ANONYMOUS_SESSION: SessionSnapshot = { user: null, isLoaded: true };

let snapshot: SessionSnapshot = PENDING;

let hasRequested = false;

const listeners = new Set<() => void>();

const notifyChange = (): void => {
  listeners.forEach((listener) => listener());
};

/** useSyncExternalStore 구독. 세션을 받아오면 스냅샷이 바뀐다. */
export const subscribeSession = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const getSessionSnapshot = (): SessionSnapshot => snapshot;

/**
 * 서버 렌더링 시점에는 세션을 읽지 않는다. 공개 화면을 정적 렌더로 남기기 위한 규칙이다.
 * 근거: docs/AuthSpec.md 4.4.
 */
export const getServerSessionSnapshot = (): SessionSnapshot => PENDING;

export const publishSession = (user: SessionUser | null): void => {
  snapshot = { user, isLoaded: true };
  notifyChange();
};

/**
 * `/api/session` 을 앱이 살아 있는 동안 한 번만 부른다.
 * 호출부는 시작만 시키고, 결과는 구독으로 화면에 전달된다(이펙트 안에서 setState 하지 않는다).
 * 실패하면 비로그인으로 다룬다 — 세션을 몰라도 공개 화면은 그대로 읽을 수 있어야 한다.
 */
export const startSessionLoad = (): void => {
  if (hasRequested) {
    return;
  }

  hasRequested = true;

  fetch(SESSION_PATH, { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) {
        publishSession(null);

        return;
      }

      const user = (await response.json()) as SessionUser | null;

      publishSession(user);
    })
    .catch(() => {
      publishSession(null);
    });
};

/**
 * 들고 있던 세션이 더는 유효하지 않을 때(예: 다른 API 가 401 을 준다) 비로그인으로 확정하고
 * 다음 마운트에서 다시 받아오게 요청 표시를 지운다.
 */
export const invalidateSession = (): void => {
  hasRequested = false;
  publishSession(null);
};

/** 테스트에서 모듈 스코프 저장소를 비운다. */
export const resetSession = (): void => {
  snapshot = PENDING;
  hasRequested = false;
  notifyChange();
};
