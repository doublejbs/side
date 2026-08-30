import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SimilarGroupView } from '@/components/discover/SimilarGroupView';
import type { OpinionGroupSummary } from '@/domain/OpinionGroupSummary';

const LOGIN_HREF = '/login?next=%2Fdiscover';

const GROUP: OpinionGroupSummary = {
  id: 'group-a',
  label: '조건부 찬성',
  share: 42,
  description: '도입에는 찬성하지만 속도는 조절하자는 사람들',
};

describe('SimilarGroupView', () => {
  it('비로그인이면 안내 문구와 로그인 링크를 보여준다', () => {
    render(<SimilarGroupView group={GROUP} votedCount={3} loginHref={LOGIN_HREF} />);

    expect(screen.getByText('로그인하면 내 생각과 비슷한 그룹을 찾아드려요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인하기/ })).toHaveAttribute('href', LOGIN_HREF);
    expect(screen.queryByText('조건부 찬성')).not.toBeInTheDocument();
  });

  it('로그인 상태에서 투표 기록이 있으면 그룹 카드를 보여준다', () => {
    render(<SimilarGroupView group={GROUP} votedCount={3} />);

    expect(screen.getByText('조건부 찬성')).toBeInTheDocument();
    expect(screen.getByText('참여한 3개 이슈 기반')).toBeInTheDocument();
  });
});
