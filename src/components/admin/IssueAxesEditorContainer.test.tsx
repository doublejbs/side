import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IssueAxesEditorContainer } from '@/components/admin/IssueAxesEditorContainer';
import { AxisDirection } from '@/domain/AxisDirection';
import type { IssueAxis } from '@/domain/IssueAxis';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

const SAVED_AXES: IssueAxis[] = [
  { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT },
];

const readDirectionOptions = (label: string): (string | null)[] =>
  Array.from(screen.getByLabelText(label).querySelectorAll('option')).map(
    (option) => option.textContent,
  );

describe('IssueAxesEditorContainer', () => {
  it('축이 하나만 저장돼 있어도 칸 두 개를 유지한다', () => {
    render(<IssueAxesEditorContainer axes={SAVED_AXES} />);

    expect(screen.getByLabelText<HTMLSelectElement>('축 1').value).toBe(PerspectiveAxis.LABOR);
    expect(screen.getByLabelText<HTMLSelectElement>('축 2').value).toBe('');
  });

  it('축을 바꾸면 방향 라벨이 그 축의 좌우 라벨로 바뀐다', async () => {
    const user = userEvent.setup();

    render(<IssueAxesEditorContainer axes={SAVED_AXES} />);

    expect(readDirectionOptions('축 1 찬성 방향')).toEqual(['왼쪽 · 기업 중심', '오른쪽 · 노동자 중심']);

    await user.selectOptions(screen.getByLabelText('축 1'), PerspectiveAxis.ENVIRONMENT);

    expect(readDirectionOptions('축 1 찬성 방향')).toEqual(['왼쪽 · 성장', '오른쪽 · 환경']);
  });

  it('축을 미지정으로 되돌리면 방향 라벨도 되돌아간다', async () => {
    const user = userEvent.setup();

    render(<IssueAxesEditorContainer axes={SAVED_AXES} />);

    await user.selectOptions(screen.getByLabelText('축 1'), '');

    expect(readDirectionOptions('축 1 찬성 방향')).toEqual(['왼쪽', '오른쪽']);
  });
});
