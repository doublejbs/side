import { VoteChoice } from '@/domain/VoteChoice';

const VOTE_CHOICE_LABEL: Record<VoteChoice, string> = {
  [VoteChoice.AGREE]: '찬성',
  [VoteChoice.UNSURE]: '아직 모르겠어요',
  [VoteChoice.DISAGREE]: '반대',
};

export const getVoteChoiceLabel = (choice: VoteChoice): string => VOTE_CHOICE_LABEL[choice];
