import { describe, expect, it } from 'vitest';

import { ClaimSide } from '@/domain/ClaimSide';
import {
  getClaimSideAnchor,
  getClaimSideLabel,
  getClaimSideTitle,
  getTargetClaimSide,
} from '@/domain/claimSidePresenter';
import { VoteChoice } from '@/domain/VoteChoice';

describe('claimSidePresenter', () => {
  it('진영마다 이슈 상세의 앵커 id를 반환한다', () => {
    expect(getClaimSideAnchor(ClaimSide.AGREE)).toBe('agree');
    expect(getClaimSideAnchor(ClaimSide.DISAGREE)).toBe('disagree');
  });

  it('진영마다 짧은 한글 라벨을 반환한다', () => {
    expect(getClaimSideLabel(ClaimSide.AGREE)).toBe('찬성');
    expect(getClaimSideLabel(ClaimSide.DISAGREE)).toBe('반대');
  });

  it('진영마다 섹션 제목을 반환한다', () => {
    expect(getClaimSideTitle(ClaimSide.AGREE)).toBe('찬성하는 사람들은 이렇게 말해요');
    expect(getClaimSideTitle(ClaimSide.DISAGREE)).toBe('반대하는 사람들은 이렇게 말해요');
  });
});

describe('getTargetClaimSide', () => {
  it('찬성에 투표하면 반대 측 주장을 읽도록 안내한다', () => {
    expect(getTargetClaimSide(VoteChoice.AGREE)).toBe(ClaimSide.DISAGREE);
  });

  it('반대에 투표하면 찬성 측 주장을 읽도록 안내한다', () => {
    expect(getTargetClaimSide(VoteChoice.DISAGREE)).toBe(ClaimSide.AGREE);
  });

  it('아직 모르겠음에 투표하면 찬성 측 주장을 읽도록 안내한다', () => {
    expect(getTargetClaimSide(VoteChoice.UNSURE)).toBe(ClaimSide.AGREE);
  });
});
