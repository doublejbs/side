import type { VoteResultResponse } from '@/domain/VoteApiTypes';

/**
 * 서버가 집계한 투표 분포를 담는 모듈 스코프 메모리 저장소.
 *
 * localStorage 에 캐시하면 분포가 오래된 값으로 고착되므로, 앱이 살아 있는 동안만 유지하고
 * 결과 화면은 마운트할 때마다 서버에서 다시 받아온다.
 * 클라이언트에서만 쓰기 때문에 서버 렌더링 시점에는 항상 비어 있다.
 */
interface VoteResultEntry {
  result: VoteResultResponse | null;
  error: Error | null;
  /** 이 항목을 쓴 요청의 순번. 더 늦게 시작한 요청의 결과만 덮어쓸 수 있다. */
  seq: number;
}

const entries = new Map<string, VoteResultEntry>();

const listeners = new Set<() => void>();

let version = 1;

let lastRequestSeq = 0;

const notifyChange = (): void => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const publish = (slug: string, entry: VoteResultEntry): void => {
  const current = entries.get(slug);

  if (current && current.seq > entry.seq) {
    return;
  }

  entries.set(slug, entry);
  notifyChange();
};

/** 요청을 보내기 직전에 순번을 받는다. 늦게 도착한 응답이 더 최근 요청 결과를 덮어쓰지 않게 한다. */
export const nextVoteRequestSeq = (): number => {
  lastRequestSeq += 1;

  return lastRequestSeq;
};

/** useSyncExternalStore 구독. 분포가 바뀌면 버전이 올라간다. */
export const subscribeVoteResult = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** 클라이언트 스냅샷. 1부터 시작하므로 0(서버 스냅샷)과 항상 구분된다. */
export const getVoteResultVersion = (): number => version;

/** 서버 렌더링 시점에는 받아온 분포가 없다. */
export const getServerVoteResultVersion = (): number => 0;

export const getVoteResult = (slug: string): VoteResultResponse | null =>
  entries.get(slug)?.result ?? null;

/** 분포를 받아오지 못했을 때의 오류. 성공 응답이 도착하면 지워진다. */
export const getVoteResultError = (slug: string): Error | null => entries.get(slug)?.error ?? null;

export const publishVoteResult = (
  slug: string,
  result: VoteResultResponse,
  seq: number,
): void => {
  publish(slug, { result, error: null, seq });
};

/** 실패해도 마지막으로 받아온 분포는 그대로 두고 오류만 덧붙인다. */
export const publishVoteResultError = (slug: string, error: Error, seq: number): void => {
  publish(slug, { result: entries.get(slug)?.result ?? null, error, seq });
};

/** 테스트에서 모듈 스코프 저장소를 비운다. */
export const resetVoteResults = (): void => {
  entries.clear();
  lastRequestSeq = 0;
  notifyChange();
};
