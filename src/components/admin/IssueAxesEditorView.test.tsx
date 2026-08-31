import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IssueAxesEditorView, type IssueAxisRow } from '@/components/admin/IssueAxesEditorView';
import { AxisDirection } from '@/domain/AxisDirection';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

const ROWS: IssueAxisRow[] = [
  { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT },
  { axis: null, agreeDirection: AxisDirection.LEFT },
];

const renderEditor = (rows: IssueAxisRow[] = ROWS) =>
  render(<IssueAxesEditorView rows={rows} onAxisChange={vi.fn()} />);

describe('IssueAxesEditorView', () => {
  it('축과 방향 칸을 행마다 하나씩 둔다', () => {
    const { container } = renderEditor();

    expect(
      Array.from(container.querySelectorAll('select')).map((select) => select.name),
    ).toEqual(['axis-0-axis', 'axis-0-direction', 'axis-1-axis', 'axis-1-direction']);
  });

  it('축 선택지는 미지정과 축 5개다', () => {
    renderEditor();

    const axisSelect = screen.getByLabelText('축 1');

    expect(Array.from(axisSelect.querySelectorAll('option')).map((option) => option.textContent)).toEqual([
      '미지정',
      '경제',
      '복지',
      '노동',
      '환경',
      '외교',
    ]);
  });

  it('저장된 축과 방향을 그대로 고른 상태로 보여준다', () => {
    renderEditor();

    expect(screen.getByLabelText<HTMLSelectElement>('축 1').value).toBe(PerspectiveAxis.LABOR);
    expect(screen.getByLabelText<HTMLSelectElement>('축 1 찬성 방향').value).toBe(
      AxisDirection.RIGHT,
    );
  });

  it('고른 축의 좌우 라벨을 방향 선택지에 보여준다', () => {
    renderEditor();

    const directionSelect = screen.getByLabelText('축 1 찬성 방향');

    expect(
      Array.from(directionSelect.querySelectorAll('option')).map((option) => option.textContent),
    ).toEqual(['왼쪽 · 기업 중심', '오른쪽 · 노동자 중심']);
  });

  it('축이 미지정이면 방향만 적는다', () => {
    renderEditor();

    const directionSelect = screen.getByLabelText('축 2 찬성 방향');

    expect(
      Array.from(directionSelect.querySelectorAll('option')).map((option) => option.textContent),
    ).toEqual(['왼쪽', '오른쪽']);
  });
});
