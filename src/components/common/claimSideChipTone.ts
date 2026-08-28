import { ChipTone } from '@/components/common/ChipTone';
import { ClaimSide } from '@/domain/ClaimSide';

/** ChipTone 은 표현 계층 enum 이라 domain 이 아닌 common 에 둔다. */
const CLAIM_SIDE_CHIP_TONE: Record<ClaimSide, ChipTone> = {
  [ClaimSide.AGREE]: ChipTone.AGREE,
  [ClaimSide.DISAGREE]: ChipTone.DISAGREE,
};

export const getClaimSideChipTone = (side: ClaimSide): ChipTone => CLAIM_SIDE_CHIP_TONE[side];
