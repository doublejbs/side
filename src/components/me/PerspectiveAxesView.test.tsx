import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PerspectiveAxesView } from '@/components/me/PerspectiveAxesView';
import { PERSPECTIVE_POINTS } from '@/data/perspectiveData';

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
});
