import { beforeEach, describe, expect, it } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import { InMemoryVoteStore } from '@/server/InMemoryVoteStore';

const SLUG = 'work-week-4-5';
const ISSUE_ID = 'issue-1';
const CLAIM_ID = 'claim-1';

let store: InMemoryVoteStore;

beforeEach(() => {
  store = new InMemoryVoteStore({ issues: { [SLUG]: ISSUE_ID }, claimIds: [CLAIM_ID] });
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
    await store.castVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);

    await expect(store.getMyVote(ISSUE_ID, 'anon-1')).resolves.toBe(VoteChoice.AGREE);
  });

  it('같은 익명 식별자가 다시 투표하면 표는 늘지 않고 선택만 바뀐다', async () => {
    await store.castVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);
    await store.castVote(ISSUE_ID, 'anon-1', VoteChoice.DISAGREE);

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 0,
      disagree: 1,
      unsure: 0,
    });
    await expect(store.getMyVote(ISSUE_ID, 'anon-1')).resolves.toBe(VoteChoice.DISAGREE);
  });

  it('선택지별로 표를 집계한다', async () => {
    await store.castVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);
    await store.castVote(ISSUE_ID, 'anon-2', VoteChoice.AGREE);
    await store.castVote(ISSUE_ID, 'anon-3', VoteChoice.UNSURE);

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 2,
      disagree: 0,
      unsure: 1,
    });
  });

  it('다른 이슈의 표는 섞이지 않는다', async () => {
    await store.castVote(ISSUE_ID, 'anon-1', VoteChoice.AGREE);
    await store.castVote('issue-2', 'anon-1', VoteChoice.DISAGREE);

    await expect(store.countVotes(ISSUE_ID)).resolves.toEqual({
      agree: 1,
      disagree: 0,
      unsure: 0,
    });
  });

  it('투표하지 않았으면 내 선택은 null 이다', async () => {
    await expect(store.getMyVote(ISSUE_ID, 'anon-1')).resolves.toBeNull();
  });
});

describe('InMemoryVoteStore 근거 피드백', () => {
  it('피드백을 저장하고 다시 읽는다', async () => {
    await store.setClaimFeedback(CLAIM_ID, 'anon-1', ClaimFeedback.PERSUADED);

    await expect(store.getMyClaimFeedback(CLAIM_ID, 'anon-1')).resolves.toBe(
      ClaimFeedback.PERSUADED,
    );
  });

  it('null 을 넣으면 기록이 지워진다', async () => {
    await store.setClaimFeedback(CLAIM_ID, 'anon-1', ClaimFeedback.PERSUADED);
    await store.setClaimFeedback(CLAIM_ID, 'anon-1', null);

    await expect(store.getMyClaimFeedback(CLAIM_ID, 'anon-1')).resolves.toBeNull();
  });

  it('다른 값으로 덮어쓸 수 있다', async () => {
    await store.setClaimFeedback(CLAIM_ID, 'anon-1', ClaimFeedback.PERSUADED);
    await store.setClaimFeedback(CLAIM_ID, 'anon-1', ClaimFeedback.LACKS_EVIDENCE);

    await expect(store.getMyClaimFeedback(CLAIM_ID, 'anon-1')).resolves.toBe(
      ClaimFeedback.LACKS_EVIDENCE,
    );
  });

  it('주장 존재 여부를 알려준다', async () => {
    await expect(store.claimExists(CLAIM_ID)).resolves.toBe(true);
    await expect(store.claimExists('unknown')).resolves.toBe(false);
  });
});
