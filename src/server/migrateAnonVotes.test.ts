import { beforeEach, describe, expect, it } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import { InMemoryVoteStore } from '@/server/InMemoryVoteStore';
import { migrateAnonVotes } from '@/server/migrateAnonVotes';
import { signCookieValue } from '@/server/signedCookie';

const SECRET = 'test-secret';
const SLUG = 'work-week-4-5';
const ISSUE_ID = 'issue-1';
const CLAIM_ID = 'claim-1';
const ANON_ID = 'anon-1';
const USER_ID = 'user-1';

const signedAnonCookie = signCookieValue(ANON_ID, SECRET);

let store: InMemoryVoteStore;

beforeEach(() => {
  store = new InMemoryVoteStore({ issues: { [SLUG]: ISSUE_ID }, claimIds: [CLAIM_ID] });
  store.seedAnonVote(ISSUE_ID, ANON_ID, VoteChoice.AGREE);
  store.seedAnonClaimFeedback(CLAIM_ID, ANON_ID, ClaimFeedback.PERSUADED);
});

describe('migrateAnonVotes', () => {
  it('익명 표와 피드백을 계정으로 옮기고 쿠키를 지우라고 알린다', async () => {
    const result = await migrateAnonVotes({
      store,
      anonCookieValue: signedAnonCookie,
      secret: SECRET,
      userId: USER_ID,
    });

    expect(result).toEqual({ clearCookie: true, votes: 1, feedbacks: 1 });
    await expect(store.getMyVote(ISSUE_ID, USER_ID)).resolves.toBe(VoteChoice.AGREE);
    await expect(store.getMyClaimFeedback(CLAIM_ID, USER_ID)).resolves.toBe(
      ClaimFeedback.PERSUADED,
    );
  });

  it('계정 표가 이미 있으면 익명 표를 지우고 계정 표를 남긴다', async () => {
    await store.castVote(ISSUE_ID, USER_ID, VoteChoice.DISAGREE);

    const result = await migrateAnonVotes({
      store,
      anonCookieValue: signedAnonCookie,
      secret: SECRET,
      userId: USER_ID,
    });

    expect(result).toEqual({ clearCookie: true, votes: 0, feedbacks: 1 });
    await expect(store.getMyVote(ISSUE_ID, USER_ID)).resolves.toBe(VoteChoice.DISAGREE);
    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 0,
      disagree: 1,
      unsure: 0,
    });
  });

  it('쿠키가 없으면 아무것도 하지 않는다', async () => {
    const result = await migrateAnonVotes({
      store,
      anonCookieValue: undefined,
      secret: SECRET,
      userId: USER_ID,
    });

    expect(result).toEqual({ clearCookie: false, votes: 0, feedbacks: 0 });
    await expect(store.getMyVote(ISSUE_ID, USER_ID)).resolves.toBeNull();
  });

  it('서명이 위조된 쿠키는 무시한다', async () => {
    const result = await migrateAnonVotes({
      store,
      anonCookieValue: signCookieValue(ANON_ID, 'other-secret'),
      secret: SECRET,
      userId: USER_ID,
    });

    expect(result).toEqual({ clearCookie: false, votes: 0, feedbacks: 0 });
    await expect(store.getMyVote(ISSUE_ID, USER_ID)).resolves.toBeNull();
  });

  it('비밀키가 없으면 이전하지 않는다', async () => {
    const result = await migrateAnonVotes({
      store,
      anonCookieValue: signedAnonCookie,
      secret: null,
      userId: USER_ID,
    });

    expect(result).toEqual({ clearCookie: false, votes: 0, feedbacks: 0 });
  });
});
