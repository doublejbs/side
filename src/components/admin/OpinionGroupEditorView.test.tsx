import { render, screen } from '@testing-library/react';

import type { OpinionGroup } from '@/domain/Issue';

import { OpinionGroupEditorView } from './OpinionGroupEditorView';

const createGroup = (id: string, share: number): OpinionGroup => ({
  id,
  label: '엉뚱한 라벨',
  share,
  description: `${id} 설명`,
  agreesWith: [],
  disagreesWith: [],
  mostDivided: [],
});

describe('OpinionGroupEditorView', () => {
  it('슬롯 id 로 짝지어 중간 그룹이 비어도 칸이 밀리지 않는다', () => {
    const { container } = render(
      <OpinionGroupEditorView
        issueId="issue-1"
        opinionGroups={[createGroup('issue-1-group-1', 40), createGroup('issue-1-group-3', 20)]}
      />,
    );

    const ids = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[name$="-id"]'),
    ).map((input) => input.value);
    const descriptions = screen.getAllByLabelText('설명') as HTMLTextAreaElement[];

    expect(ids).toEqual(['issue-1-group-1', 'issue-1-group-2', 'issue-1-group-3']);
    expect(descriptions.map((field) => field.value)).toEqual([
      'issue-1-group-1 설명',
      '',
      'issue-1-group-3 설명',
    ]);
  });

  it('라벨은 저장된 값과 무관하게 그룹 A·B·C 로 고정한다', () => {
    render(<OpinionGroupEditorView issueId="issue-1" opinionGroups={[createGroup('issue-1-group-1', 40)]} />);

    expect(screen.getByRole('heading', { name: '그룹 A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '그룹 B' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '그룹 C' })).toBeInTheDocument();
    expect(screen.queryByText('엉뚱한 라벨')).not.toBeInTheDocument();
  });
});
