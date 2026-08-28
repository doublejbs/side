import { describe, expect, it } from 'vitest';

import { getVoteChoiceLabel } from '@/domain/voteChoiceLabel';
import { VoteChoice } from '@/domain/VoteChoice';

describe('getVoteChoiceLabel', () => {
  it('선택지마다 한글 라벨을 반환한다', () => {
    expect(getVoteChoiceLabel(VoteChoice.AGREE)).toBe('찬성');
    expect(getVoteChoiceLabel(VoteChoice.UNSURE)).toBe('아직 모르겠어요');
    expect(getVoteChoiceLabel(VoteChoice.DISAGREE)).toBe('반대');
  });
});
