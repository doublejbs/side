import { ClaimSide } from '@/domain/ClaimSide';
import { VoteChoice } from '@/domain/VoteChoice';

/** 이슈 상세에서 찬성·반대 섹션을 가리키는 앵커 id. */
const CLAIM_SIDE_ANCHOR: Record<ClaimSide, string> = {
  [ClaimSide.AGREE]: 'agree',
  [ClaimSide.DISAGREE]: 'disagree',
};

const CLAIM_SIDE_LABEL: Record<ClaimSide, string> = {
  [ClaimSide.AGREE]: '찬성',
  [ClaimSide.DISAGREE]: '반대',
};

const CLAIM_SIDE_TITLE: Record<ClaimSide, string> = {
  [ClaimSide.AGREE]: '찬성하는 사람들은 이렇게 말해요',
  [ClaimSide.DISAGREE]: '반대하는 사람들은 이렇게 말해요',
};

export const getClaimSideAnchor = (side: ClaimSide): string => CLAIM_SIDE_ANCHOR[side];

export const getClaimSideLabel = (side: ClaimSide): string => CLAIM_SIDE_LABEL[side];

export const getClaimSideTitle = (side: ClaimSide): string => CLAIM_SIDE_TITLE[side];

/** 내가 찬성이면 반대 측, 그 외에는 찬성 측 주장을 읽도록 안내한다. */
export const getTargetClaimSide = (myChoice: VoteChoice): ClaimSide =>
  myChoice === VoteChoice.AGREE ? ClaimSide.DISAGREE : ClaimSide.AGREE;
