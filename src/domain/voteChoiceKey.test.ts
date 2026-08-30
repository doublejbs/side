import { describe, expect, it } from 'vitest';

import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceKey } from '@/domain/voteChoiceKey';

describe('getVoteChoiceKey', () => {
  it('선택지를 분포 키로 바꾼다', () => {
    expect(getVoteChoiceKey(VoteChoice.AGREE)).toBe('agree');
    expect(getVoteChoiceKey(VoteChoice.DISAGREE)).toBe('disagree');
    expect(getVoteChoiceKey(VoteChoice.UNSURE)).toBe('unsure');
  });

  it('모든 선택지가 서로 다른 키를 가진다', () => {
    const keys = Object.values(VoteChoice).map(getVoteChoiceKey);

    expect(new Set(keys).size).toBe(Object.values(VoteChoice).length);
  });
});
