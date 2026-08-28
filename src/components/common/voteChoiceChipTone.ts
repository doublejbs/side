import { ChipTone } from '@/components/common/ChipTone';
import { VoteChoice } from '@/domain/VoteChoice';

/** ChipTone 은 표현 계층 enum 이라 domain 이 아닌 common 에 둔다. */
const VOTE_CHOICE_CHIP_TONE: Record<VoteChoice, ChipTone> = {
  [VoteChoice.AGREE]: ChipTone.AGREE,
  [VoteChoice.DISAGREE]: ChipTone.DISAGREE,
  [VoteChoice.UNSURE]: ChipTone.NEUTRAL,
};

export const getVoteChoiceChipTone = (choice: VoteChoice): ChipTone =>
  VOTE_CHOICE_CHIP_TONE[choice];
