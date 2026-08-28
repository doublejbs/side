import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VoteResultView } from '@/components/result/VoteResultView';
import type { VoteDistribution } from '@/domain/Issue';
import { VoteChoice } from '@/domain/VoteChoice';

const distribution: VoteDistribution = { agree: 57, disagree: 31, unsure: 12 };

describe('VoteResultView', () => {
  it('투표가 반영된 참여자 수를 천 단위로 구분해 보여준다', () => {
    render(
      <VoteResultView
        participantCount={12482}
        distribution={distribution}
        myChoice={VoteChoice.AGREE}
      />,
    );

    expect(screen.getByText('12,482명이')).toBeInTheDocument();
    expect(screen.getByText('의견을 남겼어요')).toBeInTheDocument();
    // 페이지 제목(이슈 질문)이 h1 이므로 카드 제목은 h2 여야 한다.
    expect(
      screen.getByRole('heading', { level: 2, name: '12,482명이 의견을 남겼어요' }),
    ).toBeInTheDocument();
  });

  it('찬성·반대·모르겠음 퍼센트를 모두 보여준다', () => {
    render(
      <VoteResultView
        participantCount={12482}
        distribution={distribution}
        myChoice={VoteChoice.AGREE}
      />,
    );

    expect(screen.getByText('57%')).toBeInTheDocument();
    expect(screen.getByText('31%')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  it('세 선택지 라벨을 순서대로 보여준다', () => {
    render(
      <VoteResultView
        participantCount={12482}
        distribution={distribution}
        myChoice={VoteChoice.AGREE}
      />,
    );

    const rows = screen.getAllByRole('listitem');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('찬성');
    expect(rows[1]).toHaveTextContent('반대');
    expect(rows[2]).toHaveTextContent('아직 모르겠어요');
  });

  it('내 선택 항목에만 "내 선택" 배지를 보여준다', () => {
    render(
      <VoteResultView
        participantCount={12482}
        distribution={distribution}
        myChoice={VoteChoice.DISAGREE}
      />,
    );

    const rows = screen.getAllByRole('listitem');

    expect(screen.getAllByText('내 선택')).toHaveLength(1);
    expect(rows[1]).toHaveTextContent('내 선택');
    expect(rows[0]).not.toHaveTextContent('내 선택');
    expect(rows[2]).not.toHaveTextContent('내 선택');
  });

  it('내 선택이 없으면 배지를 보여주지 않는다', () => {
    render(
      <VoteResultView participantCount={12481} distribution={distribution} myChoice={null} />,
    );

    expect(screen.queryByText('내 선택')).not.toBeInTheDocument();
    expect(screen.getByText('12,481명이')).toBeInTheDocument();
  });

  it('각 막대를 progressbar로 노출하고 퍼센트를 aria-valuenow로 알린다', () => {
    render(
      <VoteResultView
        participantCount={12482}
        distribution={distribution}
        myChoice={VoteChoice.AGREE}
      />,
    );

    const bars = screen.getAllByRole('progressbar');

    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveAttribute('aria-valuenow', '57');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '31');
    expect(bars[2]).toHaveAttribute('aria-valuenow', '12');
  });
});
