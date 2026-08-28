import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClaimCardView } from '@/components/issue/ClaimCardView';
import { getClaimById } from '@/data/IssueRepository';
import { ClaimSide } from '@/domain/ClaimSide';
import type { Claim } from '@/domain/Issue';

const ISSUE_ID = 'work-week-4-5';
const CLAIM_ID = 'work-week-agree-1';

const getAgreeClaim = (): Claim => {
  const claim = getClaimById(ISSUE_ID, CLAIM_ID);

  if (!claim) {
    throw new Error(`목 데이터에 ${CLAIM_ID} 주장이 없습니다.`);
  }

  return claim;
};

describe('ClaimCardView', () => {
  it('주장 제목과 설명을 렌더링한다', () => {
    const claim = getAgreeClaim();

    render(<ClaimCardView issueId={ISSUE_ID} claim={claim} />);

    expect(screen.getByText(claim.title)).toBeInTheDocument();
    expect(screen.getByText(claim.description)).toBeInTheDocument();
  });

  it('근거 개수 칩을 렌더링한다', () => {
    render(<ClaimCardView issueId={ISSUE_ID} claim={getAgreeClaim()} />);

    expect(screen.getByText('근거 4개')).toBeInTheDocument();
  });

  it('설득된 사람 수를 천 단위 구분 기호로 렌더링한다', () => {
    render(<ClaimCardView issueId={ISSUE_ID} claim={getAgreeClaim()} />);

    expect(screen.getByText('설득됐어요 2,391')).toBeInTheDocument();
  });

  it('근거 보기 링크가 근거 화면을 가리킨다', () => {
    render(<ClaimCardView issueId={ISSUE_ID} claim={getAgreeClaim()} />);

    expect(screen.getByRole('link', { name: '근거 보기' })).toHaveAttribute(
      'href',
      `/issues/${ISSUE_ID}/claims/${CLAIM_ID}`,
    );
  });

  it('찬성과 반대 카드가 같은 구조로 렌더된다', () => {
    const agreeClaim = getAgreeClaim();
    const disagreeClaim = getClaimById(ISSUE_ID, 'work-week-disagree-1');

    if (!disagreeClaim) {
      throw new Error('목 데이터에 반대 주장이 없습니다.');
    }

    expect(disagreeClaim.side).toBe(ClaimSide.DISAGREE);

    const agree = render(<ClaimCardView issueId={ISSUE_ID} claim={agreeClaim} />);

    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: agreeClaim.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '근거 보기' })).toBeInTheDocument();

    agree.unmount();

    render(<ClaimCardView issueId={ISSUE_ID} claim={disagreeClaim} />);

    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: disagreeClaim.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '근거 보기' })).toBeInTheDocument();
  });
});
