import { beforeEach, describe, expect, it } from 'vitest';

import { AxisDirection } from '@/domain/AxisDirection';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { VoteChoice } from '@/domain/VoteChoice';
import { InMemoryVoteStore } from '@/server/InMemoryVoteStore';

const SLUG = 'work-week-4-5';
const ISSUE_ID = 'issue-1';
const OTHER_SLUG = 'ai-regulation';
const OTHER_ISSUE_ID = 'issue-2';
/** 시드에 없는 이슈 = 아직 발행되지 않은 이슈. */
const DRAFT_ISSUE_ID = 'issue-draft';
const CLAIM_ID = 'claim-1';

let store: InMemoryVoteStore;

beforeEach(() => {
  store = new InMemoryVoteStore({
    issues: { [SLUG]: ISSUE_ID, [OTHER_SLUG]: OTHER_ISSUE_ID },
    claimIds: [CLAIM_ID],
  });
});

describe('InMemoryVoteStore 이슈 조회', () => {
  it('slug 로 이슈 id 를 찾는다', async () => {
    await expect(store.getIssueIdBySlug(SLUG)).resolves.toBe(ISSUE_ID);
  });

  it('모르는 slug 는 null 이다', async () => {
    await expect(store.getIssueIdBySlug('unknown')).resolves.toBeNull();
  });
});

describe('InMemoryVoteStore 투표', () => {
  it('투표하면 내 선택을 다시 읽을 수 있다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);

    await expect(store.getMyVote(ISSUE_ID, 'user-1')).resolves.toBe(VoteChoice.AGREE);
  });

  it('같은 사용자가 다시 투표하면 표는 늘지 않고 선택만 바뀐다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.DISAGREE);

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 0,
      disagree: 1,
      unsure: 0,
    });
    await expect(store.getMyVote(ISSUE_ID, 'user-1')).resolves.toBe(VoteChoice.DISAGREE);
  });

  it('선택지별로 표를 집계한다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await store.castVote(ISSUE_ID, 'user-2', VoteChoice.AGREE);
    await store.castVote(ISSUE_ID, 'user-3', VoteChoice.UNSURE);

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 2,
      disagree: 0,
      unsure: 1,
    });
  });

  it('아직 이전되지 않은 익명 표도 함께 센다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    store.seedAnonVote(ISSUE_ID, 'anon-1', VoteChoice.DISAGREE);

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 1,
      disagree: 1,
      unsure: 0,
    });
  });

  it('다른 이슈의 표는 섞이지 않는다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await store.castVote(OTHER_ISSUE_ID, 'user-1', VoteChoice.DISAGREE);

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 1,
      disagree: 0,
      unsure: 0,
    });
  });

  it('투표하지 않았으면 내 선택은 null 이다', async () => {
    await expect(store.getMyVote(ISSUE_ID, 'user-1')).resolves.toBeNull();
  });
});

describe('InMemoryVoteStore 내 투표 목록', () => {
  it('투표한 적이 없으면 빈 목록이다', async () => {
    await expect(store.listMyVotes('user-1')).resolves.toEqual([]);
  });

  it('내 표만 최근 순서로 돌려준다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await store.castVote(OTHER_ISSUE_ID, 'user-1', VoteChoice.DISAGREE);
    await store.castVote(ISSUE_ID, 'user-2', VoteChoice.UNSURE);

    const rows = await store.listMyVotes('user-1');

    expect(rows.map((row) => row.issueSlug)).toEqual([OTHER_SLUG, SLUG]);
    expect(rows[1]).toEqual({
      issueSlug: SLUG,
      choice: VoteChoice.AGREE,
      votedAt: expect.any(String),
    });
  });

  it('아직 발행되지 않은 이슈의 표는 목록에서 뺀다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await store.castVote(DRAFT_ISSUE_ID, 'user-1', VoteChoice.DISAGREE);

    const rows = await store.listMyVotes('user-1');

    expect(rows.map((row) => row.issueSlug)).toEqual([SLUG]);
  });

  it('다시 투표하면 표는 하나로 남고 선택만 바뀐다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.UNSURE);

    const rows = await store.listMyVotes('user-1');

    expect(rows).toHaveLength(1);
    expect(rows[0].choice).toBe(VoteChoice.UNSURE);
  });

  it('아직 이전되지 않은 익명 표는 내 목록에 넣지 않는다', async () => {
    store.seedAnonVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);

    await expect(store.listMyVotes('anon-1')).resolves.toEqual([]);
  });
});

describe('InMemoryVoteStore 근거 피드백', () => {
  it('피드백을 저장하고 다시 읽는다', async () => {
    await store.setClaimFeedback(CLAIM_ID, 'user-1', ClaimFeedback.PERSUADED);

    await expect(store.getMyClaimFeedback(CLAIM_ID, 'user-1')).resolves.toBe(
      ClaimFeedback.PERSUADED,
    );
  });

  it('null 을 넣으면 기록이 지워진다', async () => {
    await store.setClaimFeedback(CLAIM_ID, 'user-1', ClaimFeedback.PERSUADED);
    await store.setClaimFeedback(CLAIM_ID, 'user-1', null);

    await expect(store.getMyClaimFeedback(CLAIM_ID, 'user-1')).resolves.toBeNull();
  });

  it('다른 값으로 덮어쓸 수 있다', async () => {
    await store.setClaimFeedback(CLAIM_ID, 'user-1', ClaimFeedback.PERSUADED);
    await store.setClaimFeedback(CLAIM_ID, 'user-1', ClaimFeedback.LACKS_EVIDENCE);

    await expect(store.getMyClaimFeedback(CLAIM_ID, 'user-1')).resolves.toBe(
      ClaimFeedback.LACKS_EVIDENCE,
    );
  });

  it('주장 존재 여부를 알려준다', async () => {
    await expect(store.claimExists(CLAIM_ID)).resolves.toBe(true);
    await expect(store.claimExists('unknown')).resolves.toBe(false);
  });
});

describe('InMemoryVoteStore 익명 레코드 이전', () => {
  it('익명 표와 피드백을 계정으로 옮긴다', async () => {
    store.seedAnonVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);
    store.seedAnonClaimFeedback(CLAIM_ID, 'anon-1', ClaimFeedback.PERSUADED);

    await expect(store.claimAnonRecords('anon-1', 'user-1')).resolves.toEqual({
      votes: 1,
      feedbacks: 1,
    });
    await expect(store.getMyVote(ISSUE_ID, 'user-1')).resolves.toBe(VoteChoice.AGREE);
    await expect(store.getMyClaimFeedback(CLAIM_ID, 'user-1')).resolves.toBe(
      ClaimFeedback.PERSUADED,
    );
  });

  it('이전해도 전체 표 수는 늘지 않는다', async () => {
    store.seedAnonVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);

    await store.claimAnonRecords('anon-1', 'user-1');

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 1,
      disagree: 0,
      unsure: 0,
    });
  });

  it('계정 표가 이미 있으면 익명 표는 지우고 계정 표를 남긴다', async () => {
    await store.castVote(ISSUE_ID, 'user-1', VoteChoice.DISAGREE);
    store.seedAnonVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);

    await expect(store.claimAnonRecords('anon-1', 'user-1')).resolves.toEqual({
      votes: 0,
      feedbacks: 0,
    });
    await expect(store.getMyVote(ISSUE_ID, 'user-1')).resolves.toBe(VoteChoice.DISAGREE);
    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 0,
      disagree: 1,
      unsure: 0,
    });
  });

  it('계정 피드백이 이미 있으면 익명 피드백은 지운다', async () => {
    await store.setClaimFeedback(CLAIM_ID, 'user-1', ClaimFeedback.NOT_PERSUADED);
    store.seedAnonClaimFeedback(CLAIM_ID, 'anon-1', ClaimFeedback.PERSUADED);

    await expect(store.claimAnonRecords('anon-1', 'user-1')).resolves.toEqual({
      votes: 0,
      feedbacks: 0,
    });
    await expect(store.getMyClaimFeedback(CLAIM_ID, 'user-1')).resolves.toBe(
      ClaimFeedback.NOT_PERSUADED,
    );
  });

  it('다른 익명 식별자의 표는 건드리지 않는다', async () => {
    store.seedAnonVote(ISSUE_ID, 'anon-2', VoteChoice.UNSURE);

    await expect(store.claimAnonRecords('anon-1', 'user-1')).resolves.toEqual({
      votes: 0,
      feedbacks: 0,
    });
    await expect(store.getMyVote(ISSUE_ID, 'user-1')).resolves.toBeNull();
    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 0,
      disagree: 0,
      unsure: 1,
    });
  });
});

describe('InMemoryVoteStore 투표 이력·관점', () => {
  let eventStore: InMemoryVoteStore;

  beforeEach(() => {
    eventStore = new InMemoryVoteStore({
      issues: { [SLUG]: ISSUE_ID, [OTHER_SLUG]: OTHER_ISSUE_ID },
      issueDetails: {
        [SLUG]: {
          question: '주 4.5일제를 도입해야 할까?',
          axes: [{ axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT }],
        },
        [OTHER_SLUG]: { question: 'AI 규제를 강화해야 할까?' },
      },
      claims: [{ id: CLAIM_ID, issueSlug: SLUG, title: '노동시간이 줄어든다' }],
    });
  });

  it('신규 투표와 선택 변경만 이력으로 남긴다', async () => {
    await eventStore.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await eventStore.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await eventStore.castVote(ISSUE_ID, 'user-1', VoteChoice.DISAGREE);

    const rows = await eventStore.listMyVoteEvents('user-1');

    expect(rows.map((row) => row.choice)).toEqual([VoteChoice.AGREE, VoteChoice.DISAGREE]);
    expect(rows[0].question).toBe('주 4.5일제를 도입해야 할까?');
    expect(rows[0].issueSlug).toBe(SLUG);
    expect(Date.parse(rows[0].createdAt)).toBeLessThan(Date.parse(rows[1].createdAt));
  });

  it('발행되지 않은 이슈와 다른 사용자의 이력은 빼고 돌려준다', async () => {
    await eventStore.castVote(DRAFT_ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await eventStore.castVote(ISSUE_ID, 'user-2', VoteChoice.AGREE);
    await eventStore.castVote(ISSUE_ID, 'user-1', VoteChoice.UNSURE);

    const rows = await eventStore.listMyVoteEvents('user-1');

    expect(rows).toHaveLength(1);
    expect(rows[0].choice).toBe(VoteChoice.UNSURE);
  });

  it('익명 표를 계정으로 옮길 때는 이력을 만들지 않는다', async () => {
    eventStore.seedAnonVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);

    await eventStore.claimAnonRecords('anon-1', 'user-1');

    await expect(eventStore.listMyVoteEvents('user-1')).resolves.toEqual([]);
  });

  it('설득됐어요 를 남긴 주장과 전체 피드백 수를 따로 센다', async () => {
    await eventStore.setClaimFeedback(CLAIM_ID, 'user-1', ClaimFeedback.PERSUADED);

    await expect(eventStore.listMyPersuadedClaims('user-1')).resolves.toEqual([
      { issueId: ISSUE_ID, claimTitle: '노동시간이 줄어든다' },
    ]);
    await expect(eventStore.countMyClaimFeedbacks('user-1')).resolves.toBe(1);

    await eventStore.setClaimFeedback(CLAIM_ID, 'user-1', ClaimFeedback.LACKS_EVIDENCE);

    await expect(eventStore.listMyPersuadedClaims('user-1')).resolves.toEqual([]);
    await expect(eventStore.countMyClaimFeedbacks('user-1')).resolves.toBe(1);
  });

  it('발행된 이슈의 내 최신 표를 축과 함께 돌려준다', async () => {
    await eventStore.castVote(ISSUE_ID, 'user-1', VoteChoice.AGREE);
    await eventStore.castVote(OTHER_ISSUE_ID, 'user-1', VoteChoice.DISAGREE);
    await eventStore.castVote(DRAFT_ISSUE_ID, 'user-1', VoteChoice.AGREE);

    await expect(eventStore.listMyVoteAxes('user-1')).resolves.toEqual([
      {
        axes: [{ axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT }],
        choice: VoteChoice.AGREE,
      },
      { axes: [], choice: VoteChoice.DISAGREE },
    ]);
  });
});
