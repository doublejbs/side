import { describe, expect, it } from 'vitest';

import { ChipTone } from '@/components/common/ChipTone';
import { getClaimSideChipTone } from '@/components/common/claimSideChipTone';
import { ClaimSide } from '@/domain/ClaimSide';

describe('getClaimSideChipTone', () => {
  it('찬성·반대 진영마다 대응하는 칩 톤을 반환한다', () => {
    expect(getClaimSideChipTone(ClaimSide.AGREE)).toBe(ChipTone.AGREE);
    expect(getClaimSideChipTone(ClaimSide.DISAGREE)).toBe(ChipTone.DISAGREE);
  });
});
