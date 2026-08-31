import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EMPTY_AXIS_NOTICE, PerspectiveAxesView } from '@/components/me/PerspectiveAxesView';
import { PERSPECTIVE_POINTS } from '@/data/perspectiveData';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import type { PerspectivePoint } from '@/domain/UserRecord';

interface AxisExpectation {
  leftLabel: string;
  name: string;
  rightLabel: string;
}

const AXIS_EXPECTATIONS: AxisExpectation[] = [
  { leftLabel: '시장 중심', name: '경제', rightLabel: '정부 역할' },
  { leftLabel: '개인 책임', name: '복지', rightLabel: '사회 책임' },
  { leftLabel: '기업 중심', name: '노동', rightLabel: '노동자 중심' },
  { leftLabel: '성장', name: '환경', rightLabel: '환경' },
  { leftLabel: '현실주의', name: '외교', rightLabel: '이상주의' },
];

describe('PerspectiveAxesView', () => {
  it('축 5개를 렌더한다', () => {
    render(<PerspectiveAxesView points={PERSPECTIVE_POINTS} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('각 축의 이름과 좌우 라벨을 보여준다', () => {
    render(<PerspectiveAxesView points={PERSPECTIVE_POINTS} />);

    const items = screen.getAllByRole('listitem');

    AXIS_EXPECTATIONS.forEach((expectation, index) => {
      const item = items[index];

      expect(within(item).getAllByText(expectation.leftLabel).length).toBeGreaterThan(0);
      expect(within(item).getAllByText(expectation.name).length).toBeGreaterThan(0);
      expect(within(item).getAllByText(expectation.rightLabel).length).toBeGreaterThan(0);
    });
  });

  it('각 축을 값이 담긴 meter로 노출한다', () => {
    render(<PerspectiveAxesView points={PERSPECTIVE_POINTS} />);

    const meters = screen.getAllByRole('meter');

    expect(meters).toHaveLength(5);

    PERSPECTIVE_POINTS.forEach((point, index) => {
      const meter = meters[index];

      expect(meter).toHaveAttribute('aria-valuenow', String(point.value));
      expect(meter.getAttribute('aria-label')).toContain(String(point.value));
    });
  });

  it('경제 축 marker 를 값 위치에 배치한다', () => {
    render(<PerspectiveAxesView points={PERSPECTIVE_POINTS} />);

    const economyMeter = screen.getByRole('meter', {
      name: '경제: 시장 중심과 정부 역할 사이 100 중 62',
    });

    expect(economyMeter.firstElementChild).toHaveStyle({ left: '62%' });
  });

  it('안내 문구를 넘기지 않으면 카드 상단에 아무것도 붙이지 않는다', () => {
    render(<PerspectiveAxesView points={PERSPECTIVE_POINTS} />);

    expect(screen.queryByText(/내 투표/)).not.toBeInTheDocument();
  });

  it('안내 문구를 넘기면 카드 상단에 보여준다', () => {
    render(<PerspectiveAxesView points={PERSPECTIVE_POINTS} noticeText="내 투표 7개 기준" />);

    expect(screen.getByText('내 투표 7개 기준')).toBeInTheDocument();
  });
});

const EMPTY_ECONOMY: PerspectivePoint = {
  axis: PerspectiveAxis.ECONOMY,
  leftLabel: '시장 중심',
  rightLabel: '정부 역할',
  value: null,
  voteCount: 0,
};

describe('PerspectiveAxesView 표가 없는 축', () => {
  it('마커 없이 트랙만 그리고 안내 문구를 붙인다', () => {
    render(<PerspectiveAxesView points={[EMPTY_ECONOMY]} />);

    const meter = screen.getByRole('meter');

    expect(meter.firstElementChild).toBeNull();
    expect(meter).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByText(EMPTY_AXIS_NOTICE)).toBeInTheDocument();
  });

  it('스크린 리더에도 값 대신 안내를 읽어 준다', () => {
    render(<PerspectiveAxesView points={[EMPTY_ECONOMY]} />);

    expect(
      screen.getByRole('meter', {
        name: `경제: 시장 중심과 정부 역할 사이 ${EMPTY_AXIS_NOTICE}`,
      }),
    ).toBeInTheDocument();
  });

  it('값이 있는 축은 그대로 마커를 그린다', () => {
    render(
      <PerspectiveAxesView points={[EMPTY_ECONOMY, { ...EMPTY_ECONOMY, axis: PerspectiveAxis.LABOR, leftLabel: '기업 중심', rightLabel: '노동자 중심', value: 80, voteCount: 4 }]} />,
    );

    expect(screen.getAllByText(EMPTY_AXIS_NOTICE)).toHaveLength(1);
  });
});
