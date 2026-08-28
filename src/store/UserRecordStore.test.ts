import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import {
  CLAIM_FEEDBACK_STORAGE_KEY,
  VOTE_STORAGE_KEY,
  getAllVotes,
  getClaimFeedback,
  getVote,
  setClaimFeedback,
  setVote,
} from '@/store/UserRecordStore';

describe('UserRecordStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('투표를 저장하고 다시 읽는다', () => {
    const saved = setVote('work-week-4-5', VoteChoice.AGREE);
    const loaded = getVote('work-week-4-5');

    expect(saved.issueId).toBe('work-week-4-5');
    expect(saved.choice).toBe(VoteChoice.AGREE);
    expect(loaded).toEqual(saved);
  });

  it('저장된 투표가 없으면 null을 반환한다', () => {
    expect(getVote('nuclear-expansion')).toBeNull();
  });

  it('같은 이슈에 다시 투표하면 덮어쓴다', () => {
    setVote('work-week-4-5', VoteChoice.AGREE);
    setVote('work-week-4-5', VoteChoice.DISAGREE);

    expect(getVote('work-week-4-5')?.choice).toBe(VoteChoice.DISAGREE);
  });

  it('모든 투표를 이슈 id로 조회할 수 있다', () => {
    setVote('work-week-4-5', VoteChoice.AGREE);
    setVote('nuclear-expansion', VoteChoice.UNSURE);

    const votes = getAllVotes();

    expect(Object.keys(votes)).toHaveLength(2);
    expect(votes['nuclear-expansion']?.choice).toBe(VoteChoice.UNSURE);
  });

  it('깨진 JSON이 저장되어 있으면 빈 상태로 복구한다', () => {
    window.localStorage.setItem(VOTE_STORAGE_KEY, '{not json');
    window.localStorage.setItem(CLAIM_FEEDBACK_STORAGE_KEY, '{not json');

    expect(getVote('work-week-4-5')).toBeNull();
    expect(getAllVotes()).toEqual({});
    expect(getClaimFeedback('claim-1')).toBeNull();

    expect(setVote('work-week-4-5', VoteChoice.AGREE).choice).toBe(VoteChoice.AGREE);
    expect(getVote('work-week-4-5')?.choice).toBe(VoteChoice.AGREE);
  });

  it('주장 피드백을 저장하고 다시 읽는다', () => {
    setClaimFeedback('claim-1', ClaimFeedback.PERSUADED);

    expect(getClaimFeedback('claim-1')).toEqual({
      claimId: 'claim-1',
      feedback: ClaimFeedback.PERSUADED,
    });
  });

  it('주장 피드백에 null을 저장하면 해제된다', () => {
    setClaimFeedback('claim-1', ClaimFeedback.LACKS_EVIDENCE);
    setClaimFeedback('claim-1', null);

    expect(getClaimFeedback('claim-1')).toBeNull();
  });

  it('저장된 피드백이 없으면 null을 반환한다', () => {
    expect(getClaimFeedback('unknown-claim')).toBeNull();
  });

  describe('SSR 가드', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('window 가 없으면 저장된 값이 있어도 빈 상태를 반환한다', () => {
      setVote('work-week-4-5', VoteChoice.AGREE);
      setClaimFeedback('claim-1', ClaimFeedback.PERSUADED);

      vi.stubGlobal('window', undefined);

      expect(typeof window).toBe('undefined');
      expect(getAllVotes()).toEqual({});
      expect(getVote('work-week-4-5')).toBeNull();
      expect(getClaimFeedback('claim-1')).toBeNull();
    });

    it('window 가 없어도 저장 시도가 예외를 던지지 않는다', () => {
      vi.stubGlobal('window', undefined);

      expect(() => setVote('work-week-4-5', VoteChoice.DISAGREE)).not.toThrow();
      expect(() => setClaimFeedback('claim-1', ClaimFeedback.PERSUADED)).not.toThrow();
      expect(setVote('work-week-4-5', VoteChoice.DISAGREE).choice).toBe(VoteChoice.DISAGREE);
    });
  });
});
