import { beforeEach, describe, expect, it } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import type { ClaimFeedbackResponse, VoteResultResponse } from '@/domain/VoteApiTypes';
import { ANON_COOKIE_NAME } from '@/server/anonCookie';
import type { AnonCookieReader } from '@/server/anonCookie';
import { InMemoryVoteStore } from '@/server/InMemoryVoteStore';
import { signCookieValue } from '@/server/signedCookie';
import { VoteApiErrorCode } from '@/server/VoteApiErrorCode';
import {
  handleCastVote,
  handleClaimFeedback,
  handleGetMyVote,
  serverVoteDisabledResponse,
} from '@/server/voteHandlers';

const SECRET = 'test-secret';
const SLUG = 'work-week-4-5';
const ISSUE_ID = 'issue-1';
const CLAIM_ID = 'claim-1';

const emptyCookies: AnonCookieReader = { get: () => undefined };

const cookiesFor = (anonId: string): AnonCookieReader => ({
  get: (name) => (name === ANON_COOKIE_NAME ? { value: signCookieValue(anonId, SECRET) } : undefined),
});

let store: InMemoryVoteStore;

beforeEach(() => {
  store = new InMemoryVoteStore({ issues: { [SLUG]: ISSUE_ID }, claimIds: [CLAIM_ID] });
});

describe('handleCastVote', () => {
  it('투표하면 갱신된 분포와 내 선택을 돌려준다', async () => {
    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: cookiesFor('anon-1'),
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      slug: SLUG,
      distribution: { agree: 100, disagree: 0, unsure: 0 },
      participantCount: 1,
      myChoice: VoteChoice.AGREE,
    } satisfies VoteResultResponse);
  });

  it('익명 쿠키가 없으면 새로 발급한다', async () => {
    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      slug: SLUG,
      body: { choice: VoteChoice.UNSURE },
    });

    expect(response.setCookie?.name).toBe(ANON_COOKIE_NAME);
    expect(response.setCookie?.options.httpOnly).toBe(true);
  });

  it('이미 쿠키가 있으면 다시 발급하지 않는다', async () => {
    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: cookiesFor('anon-1'),
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    expect(response.setCookie).toBeUndefined();
  });

  it('같은 익명 식별자가 다시 투표하면 참여자 수는 그대로다', async () => {
    const cookieStore = cookiesFor('anon-1');

    await handleCastVote({
      store,
      secret: SECRET,
      cookieStore,
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore,
      slug: SLUG,
      body: { choice: VoteChoice.DISAGREE },
    });

    expect(response.body).toEqual({
      slug: SLUG,
      distribution: { agree: 0, disagree: 100, unsure: 0 },
      participantCount: 1,
      myChoice: VoteChoice.DISAGREE,
    } satisfies VoteResultResponse);
  });

  it('여러 사람이 투표하면 퍼센트 합이 100 이다', async () => {
    await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: cookiesFor('anon-1'),
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });
    await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: cookiesFor('anon-2'),
      slug: SLUG,
      body: { choice: VoteChoice.DISAGREE },
    });

    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: cookiesFor('anon-3'),
      slug: SLUG,
      body: { choice: VoteChoice.UNSURE },
    });
    const body = response.body as VoteResultResponse;

    expect(body.participantCount).toBe(3);
    expect(body.distribution.agree + body.distribution.disagree + body.distribution.unsure).toBe(100);
  });

  it('선택지가 잘못되면 400 이다', async () => {
    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      slug: SLUG,
      body: { choice: 'MAYBE' },
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: VoteApiErrorCode.INVALID_BODY });
  });

  it('본문이 없으면 400 이다', async () => {
    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      slug: SLUG,
      body: null,
    });

    expect(response.status).toBe(400);
  });

  it('없는 이슈면 404 이다', async () => {
    const response = await handleCastVote({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      slug: 'unknown',
      body: { choice: VoteChoice.AGREE },
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: VoteApiErrorCode.ISSUE_NOT_FOUND });
  });
});

describe('handleGetMyVote', () => {
  it('투표하지 않았으면 빈 분포와 null 선택을 돌려준다', async () => {
    const response = await handleGetMyVote({
      store,
      secret: SECRET,
      cookieStore: cookiesFor('anon-1'),
      slug: SLUG,
    });

    expect(response.body).toEqual({
      slug: SLUG,
      distribution: { agree: 0, disagree: 0, unsure: 0 },
      participantCount: 0,
      myChoice: null,
    } satisfies VoteResultResponse);
  });

  it('투표한 뒤에는 내 선택을 돌려준다', async () => {
    const cookieStore = cookiesFor('anon-1');

    await handleCastVote({
      store,
      secret: SECRET,
      cookieStore,
      slug: SLUG,
      body: { choice: VoteChoice.DISAGREE },
    });

    const response = await handleGetMyVote({ store, secret: SECRET, cookieStore, slug: SLUG });

    expect((response.body as VoteResultResponse).myChoice).toBe(VoteChoice.DISAGREE);
  });

  it('없는 이슈면 404 이다', async () => {
    const response = await handleGetMyVote({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      slug: 'unknown',
    });

    expect(response.status).toBe(404);
  });
});

describe('handleClaimFeedback', () => {
  it('피드백을 저장하고 저장된 값을 돌려준다', async () => {
    const response = await handleClaimFeedback({
      store,
      secret: SECRET,
      cookieStore: cookiesFor('anon-1'),
      claimId: CLAIM_ID,
      body: { feedback: ClaimFeedback.PERSUADED },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      claimId: CLAIM_ID,
      feedback: ClaimFeedback.PERSUADED,
    } satisfies ClaimFeedbackResponse);
  });

  it('null 을 보내면 기록이 지워진다', async () => {
    const cookieStore = cookiesFor('anon-1');

    await handleClaimFeedback({
      store,
      secret: SECRET,
      cookieStore,
      claimId: CLAIM_ID,
      body: { feedback: ClaimFeedback.PERSUADED },
    });

    const response = await handleClaimFeedback({
      store,
      secret: SECRET,
      cookieStore,
      claimId: CLAIM_ID,
      body: { feedback: null },
    });

    expect(response.body).toEqual({ claimId: CLAIM_ID, feedback: null });
  });

  it('없는 주장이면 404 이다', async () => {
    const response = await handleClaimFeedback({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      claimId: 'unknown',
      body: { feedback: ClaimFeedback.PERSUADED },
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: VoteApiErrorCode.CLAIM_NOT_FOUND });
  });

  it('알 수 없는 피드백 값이면 400 이다', async () => {
    const response = await handleClaimFeedback({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      claimId: CLAIM_ID,
      body: { feedback: 'WRONG' },
    });

    expect(response.status).toBe(400);
  });

  it('익명 쿠키가 없으면 새로 발급한다', async () => {
    const response = await handleClaimFeedback({
      store,
      secret: SECRET,
      cookieStore: emptyCookies,
      claimId: CLAIM_ID,
      body: { feedback: ClaimFeedback.NOT_PERSUADED },
    });

    expect(response.setCookie?.name).toBe(ANON_COOKIE_NAME);
  });
});

describe('serverVoteDisabledResponse', () => {
  it('목 데이터 모드에서는 503 을 돌려준다', () => {
    expect(serverVoteDisabledResponse()).toEqual({
      status: 503,
      body: { error: VoteApiErrorCode.SERVER_VOTE_DISABLED },
    });
  });
});
