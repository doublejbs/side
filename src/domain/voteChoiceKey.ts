import type { VoteDistribution } from '@/domain/Issue';
import { VoteChoice } from '@/domain/VoteChoice';

const VOTE_CHOICE_KEY: Record<VoteChoice, keyof VoteDistribution> = {
  [VoteChoice.AGREE]: 'agree',
  [VoteChoice.DISAGREE]: 'disagree',
  [VoteChoice.UNSURE]: 'unsure',
};

/**
 * 투표 선택지를 분포·표 수 객체의 키로 바꾼다.
 * 분포(`VoteDistribution`)와 표 수(`VoteCounts`)는 같은 키를 쓰므로 이 매핑 하나만 둔다.
 */
export const getVoteChoiceKey = (choice: VoteChoice): keyof VoteDistribution =>
  VOTE_CHOICE_KEY[choice];
