import type { MyVote } from '@/domain/MyVote';
import type { MyVotesResponse } from '@/domain/VoteApiTypes';

/** 내 투표 조회 결과. 아직 모를 때(`isLoaded === false`)는 화면이 판단을 미룬다. */
export interface MyVotesSnapshot {
  /** 비로그인이거나 조회에 실패하면 null. 로그인 사용자의 표가 없으면 빈 배열이다. */
  votes: MyVote[] | null;
  isLoaded: boolean;
}

const MY_VOTES_PATH = '/api/me/votes';

/**
 * 아직 내 투표를 모를 때의 스냅샷. `useSyncExternalStore` 가 매번 같은 참조를 받아야 하므로
 * 새 객체를 만들지 않고 이 상수를 그대로 돌려준다.
 */
export const PENDING_MY_VOTES: MyVotesSnapshot = { votes: null, isLoaded: false };

/** 비로그인(또는 로그인이 꺼진 환경)이라 조회하지 않을 때 쓰는 확정 스냅샷. */
export const ANONYMOUS_MY_VOTES: MyVotesSnapshot = { votes: null, isLoaded: true };

let snapshot: MyVotesSnapshot = PENDING_MY_VOTES;

let hasRequested = false;

const listeners = new Set<() => void>();

const notifyChange = (): void => {
  listeners.forEach((listener) => listener());
};

/** useSyncExternalStore 구독. 목록을 받아오면 스냅샷이 바뀐다. */
export const subscribeMyVotes = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const getMyVotesSnapshot = (): MyVotesSnapshot => snapshot;

/**
 * 서버 렌더링 시점에는 내 투표를 읽지 않는다. 공개 화면을 정적 렌더로 남기기 위한 규칙이다.
 * 근거: docs/AuthSpec.md 4.4.
 */
export const getServerMyVotesSnapshot = (): MyVotesSnapshot => PENDING_MY_VOTES;

export const publishMyVotes = (votes: MyVote[] | null): void => {
  snapshot = { votes, isLoaded: true };
  notifyChange();
};

/**
 * `GET /api/me/votes` 를 한 번만 부른다.
 * 호출부는 시작만 시키고, 결과는 구독으로 화면에 전달된다(이펙트 안에서 setState 하지 않는다).
 * 401(로그인 필요)이나 요청 실패는 `votes: null` 로 다룬다 — 내 집계 없이도 화면은 그대로 열린다.
 */
export const startMyVotesLoad = (): void => {
  if (hasRequested) {
    return;
  }

  hasRequested = true;

  fetch(MY_VOTES_PATH, { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) {
        publishMyVotes(null);

        return;
      }

      const body = (await response.json()) as MyVotesResponse;

      publishMyVotes(body.votes);
    })
    .catch(() => {
      publishMyVotes(null);
    });
};

/**
 * 투표가 서버에 저장되면 목록이 오래된 값이 되므로 다음 조회에서 다시 받아오게 한다.
 * 화면이 깜빡이지 않도록 마지막 목록은 그대로 두고 요청 표시만 지운다.
 */
export const invalidateMyVotes = (): void => {
  hasRequested = false;
};

/** 테스트에서 모듈 스코프 저장소를 비운다. */
export const resetMyVotes = (): void => {
  snapshot = PENDING_MY_VOTES;
  hasRequested = false;
  notifyChange();
};
