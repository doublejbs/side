import { describe, expect, it } from 'vitest';

import { ChipTone } from '@/components/common/ChipTone';
import { getVoteChoiceChipTone } from '@/components/common/voteChoiceChipTone';
import { VoteChoice } from '@/domain/VoteChoice';

describe('getVoteChoiceChipTone', () => {
  it('선택지마다 칩 톤을 반환한다', () => {
    expect(getVoteChoiceChipTone(VoteChoice.AGREE)).toBe(ChipTone.AGREE);
    expect(getVoteChoiceChipTone(VoteChoice.DISAGREE)).toBe(ChipTone.DISAGREE);
    expect(getVoteChoiceChipTone(VoteChoice.UNSURE)).toBe(ChipTone.NEUTRAL);
  });
});
