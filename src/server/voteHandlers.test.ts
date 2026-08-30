import { beforeEach, describe, expect, it } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { SessionUser } from '@/domain/SessionUser';
import { VoteChoice } from '@/domain/VoteChoice';
import type { ClaimFeedbackResponse, VoteResultResponse } from '@/domain/VoteApiTypes';
import { InMemoryVoteStore } from '@/server/InMemoryVoteStore';
import { VoteApiErrorCode } from '@/server/VoteApiErrorCode';
import {
  handleCastVote,
  handleClaimFeedback,
  handleGetMyVote,
  serverVoteDisabledResponse,
} from '@/server/voteHandlers';

const SLUG = 'work-week-4-5';
const ISSUE_ID = 'issue-1';
const CLAIM_ID = 'claim-1';

const createSessionUser = (id: string): SessionUser => ({
  id,
  email: `${id}@example.test`,
  name: '테스터',
  avatarUrl: null,
});

const USER = createSessionUser('user-1');

let store: InMemoryVoteStore;

beforeEach(() => {
  store = new InMemoryVoteStore({ issues: { [SLUG]: ISSUE_ID }, claimIds: [CLAIM_ID] });
});

describe('handleCastVote', () => {
  it('투표하면 갱신된 분포와 내 선택을 돌려준다', async () => {
    const response = await handleCastVote({
      store,
      sessionUser: USER,
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

  it('비로그인이면 401 이다', async () => {
    const response = await handleCastVote({
      store,
      sessionUser: null,
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: VoteApiErrorCode.LOGIN_REQUIRED });
  });

  it('비로그인 요청은 표를 남기지 않는다', async () => {
    await handleCastVote({
      store,
      sessionUser: null,
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 0,
      disagree: 0,
      unsure: 0,
    });
  });

  it('표는 userId 로 저장된다', async () => {
    await handleCastVote({
      store,
      sessionUser: USER,
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    await expect(store.getMyVote(ISSUE_ID, USER.id)).resolves.toBe(VoteChoice.AGREE);
  });

  it('같은 사용자가 다시 투표하면 참여자 수는 그대로다', async () => {
    await handleCastVote({
      store,
      sessionUser: USER,
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    const response = await handleCastVote({
      store,
      sessionUser: USER,
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
      sessionUser: createSessionUser('user-1'),
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });
    await handleCastVote({
      store,
      sessionUser: createSessionUser('user-2'),
      slug: SLUG,
      body: { choice: VoteChoice.DISAGREE },
    });

    const response = await handleCastVote({
      store,
      sessionUser: createSessionUser('user-3'),
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
      sessionUser: USER,
      slug: SLUG,
      body: { choice: 'MAYBE' },
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: VoteApiErrorCode.INVALID_BODY });
  });

  it('본문이 없으면 400 이다', async () => {
    const response = await handleCastVote({ store, sessionUser: USER, slug: SLUG, body: null });

    expect(response.status).toBe(400);
  });

  it('없는 이슈면 404 이다', async () => {
    const response = await handleCastVote({
      store,
      sessionUser: USER,
      slug: 'unknown',
      body: { choice: VoteChoice.AGREE },
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: VoteApiErrorCode.ISSUE_NOT_FOUND });
  });
});

describe('handleGetMyVote', () => {
  it('투표하지 않았으면 빈 분포와 null 선택을 돌려준다', async () => {
    const response = await handleGetMyVote({ store, sessionUser: USER, slug: SLUG });

    expect(response.body).toEqual({
      slug: SLUG,
      distribution: { agree: 0, disagree: 0, unsure: 0 },
      participantCount: 0,
      myChoice: null,
    } satisfies VoteResultResponse);
  });

  it('투표한 뒤에는 내 선택을 돌려준다', async () => {
    await handleCastVote({
      store,
      sessionUser: USER,
      slug: SLUG,
      body: { choice: VoteChoice.DISAGREE },
    });

    const response = await handleGetMyVote({ store, sessionUser: USER, slug: SLUG });

    expect((response.body as VoteResultResponse).myChoice).toBe(VoteChoice.DISAGREE);
  });

  it('비로그인이면 분포만 돌려주고 내 선택은 null 이다', async () => {
    await handleCastVote({
      store,
      sessionUser: USER,
      slug: SLUG,
      body: { choice: VoteChoice.AGREE },
    });

    const response = await handleGetMyVote({ store, sessionUser: null, slug: SLUG });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      slug: SLUG,
      distribution: { agree: 100, disagree: 0, unsure: 0 },
      participantCount: 1,
      myChoice: null,
    } satisfies VoteResultResponse);
  });

  it('없는 이슈면 404 이다', async () => {
    const response = await handleGetMyVote({ store, sessionUser: null, slug: 'unknown' });

    expect(response.status).toBe(404);
  });
});

describe('handleClaimFeedback', () => {
  it('피드백을 저장하고 저장된 값을 돌려준다', async () => {
    const response = await handleClaimFeedback({
      store,
      sessionUser: USER,
      claimId: CLAIM_ID,
      body: { feedback: ClaimFeedback.PERSUADED },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      claimId: CLAIM_ID,
      feedback: ClaimFeedback.PERSUADED,
    } satisfies ClaimFeedbackResponse);
    await expect(store.getMyClaimFeedback(CLAIM_ID, USER.id)).resolves.toBe(
      ClaimFeedback.PERSUADED,
    );
  });

  it('비로그인이면 401 이다', async () => {
    const response = await handleClaimFeedback({
      store,
      sessionUser: null,
      claimId: CLAIM_ID,
      body: { feedback: ClaimFeedback.PERSUADED },
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: VoteApiErrorCode.LOGIN_REQUIRED });
  });

  it('null 을 보내면 기록이 지워진다', async () => {
    await handleClaimFeedback({
      store,
      sessionUser: USER,
      claimId: CLAIM_ID,
      body: { feedback: ClaimFeedback.PERSUADED },
    });

    const response = await handleClaimFeedback({
      store,
      sessionUser: USER,
      claimId: CLAIM_ID,
      body: { feedback: null },
    });

    expect(response.body).toEqual({ claimId: CLAIM_ID, feedback: null });
  });

  it('없는 주장이면 404 이다', async () => {
    const response = await handleClaimFeedback({
      store,
      sessionUser: USER,
      claimId: 'unknown',
      body: { feedback: ClaimFeedback.PERSUADED },
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: VoteApiErrorCode.CLAIM_NOT_FOUND });
  });

  it('알 수 없는 피드백 값이면 400 이다', async () => {
    const response = await handleClaimFeedback({
      store,
      sessionUser: USER,
      claimId: CLAIM_ID,
      body: { feedback: 'WRONG' },
    });

    expect(response.status).toBe(400);
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
