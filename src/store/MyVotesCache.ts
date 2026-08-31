import type { MyVote } from '@/domain/MyVote';
import type { MyVotesResponse } from '@/domain/VoteApiTypes';
import { invalidateSession } from '@/store/SessionCache';

/** 내 투표 조회 결과. 아직 모를 때(`isLoaded === false`)는 화면이 판단을 미룬다. */
export interface MyVotesSnapshot {
  /** 비로그인이거나 조회에 실패하면 null. 로그인 사용자의 표가 없으면 빈 배열이다. */
  votes: MyVote[] | null;
  isLoaded: boolean;
}

const MY_VOTES_PATH = '/api/me/votes';

/** 로그인이 필요한 요청을 비로그인으로 보냈을 때 서버가 주는 상태 코드. */
const UNAUTHORIZED_STATUS = 401;

/**
 * 아직 내 투표를 모를 때의 스냅샷. `useSyncExternalStore` 가 매번 같은 참조를 받아야 하므로
 * 새 객체를 만들지 않고 이 상수를 그대로 돌려준다.
 */
export const PENDING_MY_VOTES: MyVotesSnapshot = { votes: null, isLoaded: false };

/** 비로그인(또는 로그인이 꺼진 환경)이라 조회하지 않을 때 쓰는 확정 스냅샷. */
export const ANONYMOUS_MY_VOTES: MyVotesSnapshot = { votes: null, isLoaded: true };

let snapshot: MyVotesSnapshot = PENDING_MY_VOTES;

let hasRequested = false;

/** 마지막으로 시작한 요청의 순번. 늦게 도착한 옛 응답을 알아보고 버리는 데 쓴다. */
let latestRequestSeq = 0;

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

const publishMyVotes = (votes: MyVote[] | null): void => {
  snapshot = { votes, isLoaded: true };
  notifyChange();
};

/**
 * 로그인이 없거나 세션이 끊겼다. 다시 물어도 답이 같으므로 재시도하지 않고 비로그인으로 확정한다.
 * 들고 있던 세션도 더는 유효하지 않으므로 함께 비운다.
 */
const handleUnauthorized = (): void => {
  invalidateSession();
  publishMyVotes(null);
};

/**
 * 서버 오류·네트워크 실패. 다음 마운트에서 다시 시도하도록 요청 표시를 되돌린다.
 * 이미 받아 둔 목록은 그대로 두고, 아직 아무것도 못 받았을 때만 "집계 없음" 으로 확정한다.
 */
const handleFailure = (): void => {
  hasRequested = false;

  if (!snapshot.isLoaded) {
    publishMyVotes(null);
  }
};

/**
 * `GET /api/me/votes` 를 한 번만 부른다.
 * 호출부는 시작만 시키고, 결과는 구독으로 화면에 전달된다(이펙트 안에서 setState 하지 않는다).
 * 401 은 비로그인으로 확정하고, 그 밖의 실패는 다음 마운트에서 다시 시도한다.
 */
export const startMyVotesLoad = (): void => {
  if (hasRequested) {
    return;
  }

  hasRequested = true;
  latestRequestSeq += 1;

  const requestSeq = latestRequestSeq;
  const isStale = (): boolean => requestSeq !== latestRequestSeq;

  fetch(MY_VOTES_PATH, { cache: 'no-store' })
    .then(async (response) => {
      if (isStale()) {
        return;
      }

      if (response.status === UNAUTHORIZED_STATUS) {
        handleUnauthorized();

        return;
      }

      if (!response.ok) {
        handleFailure();

        return;
      }

      const body = (await response.json()) as MyVotesResponse;

      // 본문을 읽는 동안 새 요청이 시작됐다면 그쪽 결과가 최신이다.
      if (isStale()) {
        return;
      }

      publishMyVotes(body.votes);
    })
    .catch(() => {
      if (isStale()) {
        return;
      }

      handleFailure();
    });
};

/**
 * 투표가 서버에 저장되면 목록이 오래된 값이 되므로 다시 받아오게 한다.
 * 화면이 깜빡이지 않도록 마지막 목록은 그대로 두고, 구독 중인 화면이 있으면 바로 다시 부른다.
 */
export const invalidateMyVotes = (): void => {
  hasRequested = false;

  if (listeners.size > 0) {
    startMyVotesLoad();
  }
};

/** 테스트에서 모듈 스코프 저장소를 비운다. */
export const resetMyVotes = (): void => {
  snapshot = PENDING_MY_VOTES;
  hasRequested = false;
  // 앞선 테스트가 남긴 진행 중 요청의 응답을 버린다.
  latestRequestSeq += 1;
  notifyChange();
};
