import { verifyAnonId } from '@/server/anonCookie';
import type { VoteStore } from '@/server/VoteStore';

export interface MigrateAnonVotesDeps {
  store: VoteStore;
  /** `side_anon` 쿠키의 서명된 값. 없으면 이전할 익명 표가 없다. */
  anonCookieValue: string | undefined;
  /** 쿠키 서명 비밀키. 없으면 값을 믿을 수 없으므로 이전하지 않는다. */
  secret: string | null;
  userId: string;
}

export interface MigrateAnonVotesResult {
  /** 이전을 시도했으므로 호출부가 `side_anon` 쿠키를 지워야 하는지. */
  clearCookie: boolean;
  votes: number;
  feedbacks: number;
}

const NOTHING_TO_MIGRATE: MigrateAnonVotesResult = { clearCookie: false, votes: 0, feedbacks: 0 };

/**
 * 첫 로그인 때 익명 투표·피드백을 계정으로 이전한다.
 * 쿠키 서명이 유효할 때만 이전하고, 끝나면 쿠키를 지우라고 알린다.
 * 근거: docs/AuthSpec.md 4.3.
 */
export const migrateAnonVotes = async ({
  store,
  anonCookieValue,
  secret,
  userId,
}: MigrateAnonVotesDeps): Promise<MigrateAnonVotesResult> => {
  if (!secret || !anonCookieValue) {
    return NOTHING_TO_MIGRATE;
  }

  const anonId = verifyAnonId(anonCookieValue, secret);

  if (!anonId) {
    return NOTHING_TO_MIGRATE;
  }

  const { votes, feedbacks } = await store.claimAnonRecords(anonId, userId);

  return { clearCookie: true, votes, feedbacks };
};
