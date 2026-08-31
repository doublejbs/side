import { beforeEach, describe, expect, it } from 'vitest';

import { AxisDirection } from '@/domain/AxisDirection';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { MyPerspectiveResponse } from '@/domain/MyPerspective';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import type { SessionUser } from '@/domain/SessionUser';
import { VoteChoice } from '@/domain/VoteChoice';
import type {
  ClaimFeedbackResponse,
  MyVotesResponse,
  VoteResultResponse,
} from '@/domain/VoteApiTypes';
import { InMemoryVoteStore } from '@/server/InMemoryVoteStore';
import { VoteApiErrorCode } from '@/server/VoteApiErrorCode';
import {
  handleCastVote,
  handleClaimFeedback,
  handleGetMyVote,
  handleListMyVotes,
  handleMyPerspective,
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

describe('handleListMyVotes', () => {
  it('비로그인이면 401 이다', async () => {
    const response = await handleListMyVotes({ store, sessionUser: null });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: VoteApiErrorCode.LOGIN_REQUIRED });
  });

  it('투표한 적이 없으면 빈 목록이다', async () => {
    const response = await handleListMyVotes({ store, sessionUser: USER });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ votes: [] } satisfies MyVotesResponse);
  });

  it('내 표만 최근 순서로 slug 와 함께 돌려준다', async () => {
    const otherSlug = 'nuclear-expansion';
    const otherIssueId = 'issue-2';

    store = new InMemoryVoteStore({ issues: { [SLUG]: ISSUE_ID, [otherSlug]: otherIssueId } });

    await store.castVote(ISSUE_ID, USER.id, VoteChoice.AGREE);
    await store.castVote(otherIssueId, USER.id, VoteChoice.DISAGREE);
    await store.castVote(ISSUE_ID, 'user-2', VoteChoice.UNSURE);

    const response = await handleListMyVotes({ store, sessionUser: USER });
    const body = response.body as MyVotesResponse;

    expect(body.votes.map((vote) => vote.slug)).toEqual([otherSlug, SLUG]);
    expect(body.votes[0].choice).toBe(VoteChoice.DISAGREE);
    expect(Date.parse(body.votes[0].votedAt)).not.toBeNaN();
  });

  it('아직 발행되지 않은 이슈의 표는 빼고 돌려준다', async () => {
    await store.castVote(ISSUE_ID, USER.id, VoteChoice.AGREE);
    await store.castVote('draft-issue', USER.id, VoteChoice.DISAGREE);

    const response = await handleListMyVotes({ store, sessionUser: USER });

    expect(response.body).toEqual({
      votes: [{ slug: SLUG, choice: VoteChoice.AGREE, votedAt: expect.any(String) }],
    });
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

const OTHER_SLUG = 'nuclear-expansion';
const OTHER_ISSUE_ID = 'issue-2';
const OTHER_CLAIM_ID = 'claim-2';
/** 축이 둘 붙은 이슈. 표 한 장이 두 축에 각각 반영되는지 본다. */
const TWO_AXES_SLUG = 'property-tax';
const TWO_AXES_ISSUE_ID = 'issue-3';

/** 관점 응답을 단언하기 좋게 축을 이름으로 찾는다. */
const findPoint = (body: MyPerspectiveResponse, axis: PerspectiveAxis) => {
  const point = body.points.find((item) => item.axis === axis);

  if (!point) {
    throw new Error(`축을 찾을 수 없다: ${axis}`);
  }

  return point;
};

describe('handleMyPerspective', () => {
  let perspectiveStore: InMemoryVoteStore;

  beforeEach(() => {
    perspectiveStore = new InMemoryVoteStore({
      issues: {
        [SLUG]: ISSUE_ID,
        [OTHER_SLUG]: OTHER_ISSUE_ID,
        [TWO_AXES_SLUG]: TWO_AXES_ISSUE_ID,
      },
      issueDetails: {
        [SLUG]: {
          question: '주 4.5일제를 도입해야 할까?',
          axes: [{ axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT }],
        },
        [OTHER_SLUG]: {
          question: '원전 비중을 확대해야 할까?',
          axes: [{ axis: PerspectiveAxis.ENVIRONMENT, agreeDirection: AxisDirection.LEFT }],
        },
        [TWO_AXES_SLUG]: {
          question: '보유세를 올려야 할까?',
          axes: [
            { axis: PerspectiveAxis.ECONOMY, agreeDirection: AxisDirection.RIGHT },
            { axis: PerspectiveAxis.WELFARE, agreeDirection: AxisDirection.RIGHT },
          ],
        },
      },
      claims: [
        { id: CLAIM_ID, issueSlug: SLUG, title: '노동시간이 줄어든다' },
        { id: OTHER_CLAIM_ID, issueSlug: OTHER_SLUG, title: '전력 수급이 안정된다' },
      ],
    });
  });

  it('비로그인이면 401 이다', async () => {
    const response = await handleMyPerspective({ store: perspectiveStore, sessionUser: null });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: VoteApiErrorCode.LOGIN_REQUIRED });
  });

  it('투표가 없으면 축 5개가 모두 비어 있다', async () => {
    const response = await handleMyPerspective({ store: perspectiveStore, sessionUser: USER });
    const body = response.body as MyPerspectiveResponse;

    expect(response.status).toBe(200);
    expect(body.points).toHaveLength(5);
    expect(body.points.every((point) => point.value === null && point.voteCount === 0)).toBe(true);
    expect(body.changes).toEqual([]);
    expect(body.feedbackCount).toBe(0);
  });

  it('내 표로 축 값을 계산한다', async () => {
    await perspectiveStore.castVote(ISSUE_ID, USER.id, VoteChoice.AGREE);
    await perspectiveStore.castVote(OTHER_ISSUE_ID, USER.id, VoteChoice.AGREE);

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(findPoint(body, PerspectiveAxis.LABOR)).toMatchObject({ value: 100, voteCount: 1 });
    expect(findPoint(body, PerspectiveAxis.ENVIRONMENT)).toMatchObject({ value: 0, voteCount: 1 });
    expect(findPoint(body, PerspectiveAxis.ECONOMY).value).toBeNull();
  });

  it('축이 둘인 이슈의 표는 두 축 모두에 반영한다', async () => {
    await perspectiveStore.castVote(TWO_AXES_ISSUE_ID, USER.id, VoteChoice.AGREE);

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(findPoint(body, PerspectiveAxis.ECONOMY)).toMatchObject({ value: 100, voteCount: 1 });
    expect(findPoint(body, PerspectiveAxis.WELFARE)).toMatchObject({ value: 100, voteCount: 1 });
    // 표 한 장이 두 축에 각각 세어진다(화면 안내가 "이슈" 가 아니라 "투표" 인 이유다).
    expect(body.points.reduce((total, point) => total + point.voteCount, 0)).toBe(2);
  });

  it('축이 둘인 이슈에 반대하면 두 축 모두 반대 방향이다', async () => {
    await perspectiveStore.castVote(TWO_AXES_ISSUE_ID, USER.id, VoteChoice.DISAGREE);

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(findPoint(body, PerspectiveAxis.ECONOMY)).toMatchObject({ value: 0, voteCount: 1 });
    expect(findPoint(body, PerspectiveAxis.WELFARE)).toMatchObject({ value: 0, voteCount: 1 });
  });

  it('첫 투표만 있으면 변화가 없다', async () => {
    await perspectiveStore.castVote(ISSUE_ID, USER.id, VoteChoice.AGREE);
    await perspectiveStore.castVote(OTHER_ISSUE_ID, USER.id, VoteChoice.DISAGREE);

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(body.changes).toEqual([]);
  });

  it('같은 이슈에서 선택이 바뀐 쌍만 변화로 만든다', async () => {
    await perspectiveStore.castVote(ISSUE_ID, USER.id, VoteChoice.AGREE);
    await perspectiveStore.castVote(ISSUE_ID, USER.id, VoteChoice.AGREE);
    await perspectiveStore.castVote(ISSUE_ID, USER.id, VoteChoice.DISAGREE);

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(body.changes).toEqual([
      {
        slug: SLUG,
        question: '주 4.5일제를 도입해야 할까?',
        before: VoteChoice.AGREE,
        beforeAt: expect.any(String),
        after: VoteChoice.DISAGREE,
        afterAt: expect.any(String),
        persuadedClaimTitle: null,
      },
    ]);
    expect(Date.parse(body.changes[0].beforeAt)).toBeLessThan(Date.parse(body.changes[0].afterAt));
  });

  it('변화에 그 이슈의 설득됐어요 주장 제목을 붙인다', async () => {
    await perspectiveStore.castVote(ISSUE_ID, USER.id, VoteChoice.AGREE);
    await perspectiveStore.castVote(ISSUE_ID, USER.id, VoteChoice.DISAGREE);
    await perspectiveStore.setClaimFeedback(CLAIM_ID, USER.id, ClaimFeedback.PERSUADED);
    await perspectiveStore.setClaimFeedback(OTHER_CLAIM_ID, USER.id, ClaimFeedback.NOT_PERSUADED);

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(body.changes[0].persuadedClaimTitle).toBe('노동시간이 줄어든다');
    expect(body.feedbackCount).toBe(2);
  });

  it('변화는 최신순으로 최대 5건만 담는다', async () => {
    const choices = [
      VoteChoice.AGREE,
      VoteChoice.DISAGREE,
      VoteChoice.AGREE,
      VoteChoice.DISAGREE,
      VoteChoice.AGREE,
      VoteChoice.DISAGREE,
      VoteChoice.UNSURE,
    ];

    for (const choice of choices) {
      await perspectiveStore.castVote(ISSUE_ID, USER.id, choice);
    }

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(body.changes).toHaveLength(5);
    expect(body.changes[0].after).toBe(VoteChoice.UNSURE);
    expect(body.changes[0].before).toBe(VoteChoice.DISAGREE);
    expect(Date.parse(body.changes[0].afterAt)).toBeGreaterThan(
      Date.parse(body.changes[1].afterAt),
    );
  });

  it('다른 사용자의 표는 섞이지 않는다', async () => {
    await perspectiveStore.castVote(ISSUE_ID, 'user-2', VoteChoice.AGREE);
    await perspectiveStore.castVote(ISSUE_ID, 'user-2', VoteChoice.DISAGREE);

    const body = (await handleMyPerspective({ store: perspectiveStore, sessionUser: USER }))
      .body as MyPerspectiveResponse;

    expect(body.changes).toEqual([]);
    expect(findPoint(body, PerspectiveAxis.LABOR).voteCount).toBe(0);
  });
});
