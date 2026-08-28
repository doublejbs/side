import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import type { ClaimFeedbackRecord, VoteRecord } from '@/domain/UserRecord';

export const VOTE_STORAGE_KEY = 'side:votes';
export const CLAIM_FEEDBACK_STORAGE_KEY = 'side:claimFeedback';

type VoteMap = Record<string, VoteRecord>;
type ClaimFeedbackMap = Record<string, ClaimFeedbackRecord>;

const isBrowser = (): boolean => typeof window !== 'undefined';

const readMap = <T>(key: string): Record<string, T> => {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, T>;
  } catch {
    return {};
  }
};

const writeMap = <T>(key: string, value: Record<string, T>): void => {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 없거나 접근이 차단된 경우 조용히 무시한다.
  }
};

let version = 1;

const listeners = new Set<() => void>();

const notifyChange = (): void => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const handleStorageChange = (event: StorageEvent): void => {
  if (event.key === null || event.key === VOTE_STORAGE_KEY || event.key === CLAIM_FEEDBACK_STORAGE_KEY) {
    notifyChange();
  }
};

/** useSyncExternalStore 구독. 저장 값이 바뀌면 버전이 올라간다. */
export const subscribeUserRecord = (listener: () => void): (() => void) => {
  if (listeners.size === 0 && isBrowser()) {
    window.addEventListener('storage', handleStorageChange);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && isBrowser()) {
      window.removeEventListener('storage', handleStorageChange);
    }
  };
};

/** 클라이언트 스냅샷. 1부터 시작하므로 0(서버 스냅샷)과 항상 구분된다. */
export const getUserRecordVersion = (): number => version;

/** 서버 렌더링 시점에는 저장된 기록이 없다. */
export const getServerUserRecordVersion = (): number => 0;

export const getAllVotes = (): VoteMap => readMap<VoteRecord>(VOTE_STORAGE_KEY);

export const getVote = (issueId: string): VoteRecord | null =>
  getAllVotes()[issueId] ?? null;

export const setVote = (issueId: string, choice: VoteChoice): VoteRecord => {
  const record: VoteRecord = { issueId, choice, votedAt: new Date().toISOString() };
  const votes = getAllVotes();

  writeMap<VoteRecord>(VOTE_STORAGE_KEY, { ...votes, [issueId]: record });
  notifyChange();

  return record;
};

const getAllClaimFeedbacks = (): ClaimFeedbackMap =>
  readMap<ClaimFeedbackRecord>(CLAIM_FEEDBACK_STORAGE_KEY);

export const getClaimFeedback = (claimId: string): ClaimFeedbackRecord | null =>
  getAllClaimFeedbacks()[claimId] ?? null;

export const setClaimFeedback = (
  claimId: string,
  feedback: ClaimFeedback | null,
): ClaimFeedbackRecord | null => {
  const feedbacks = getAllClaimFeedbacks();

  if (feedback === null) {
    const rest = { ...feedbacks };

    delete rest[claimId];
    writeMap<ClaimFeedbackRecord>(CLAIM_FEEDBACK_STORAGE_KEY, rest);
    notifyChange();

    return null;
  }

  const record: ClaimFeedbackRecord = { claimId, feedback };

  writeMap<ClaimFeedbackRecord>(CLAIM_FEEDBACK_STORAGE_KEY, {
    ...feedbacks,
    [claimId]: record,
  });
  notifyChange();

  return record;
};
