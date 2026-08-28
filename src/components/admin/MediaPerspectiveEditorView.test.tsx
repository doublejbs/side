import { render, screen } from '@testing-library/react';

import type { MediaPerspective } from '@/domain/Issue';
import { MediaLeaning } from '@/domain/MediaLeaning';

import { MediaPerspectiveEditorView } from './MediaPerspectiveEditorView';

const createPerspective = (leaning: MediaLeaning): MediaPerspective => ({
  leaning,
  articleCount: 2,
  frame: `${leaning} 프레임`,
  keywords: ['키워드'],
  representativeArticle: { title: '대표 기사', source: '예시일보', url: 'https://example.com/a' },
});

const readHiddenValues = (container: HTMLElement, suffix: string): string[] =>
  Array.from(container.querySelectorAll<HTMLInputElement>(`input[name$="${suffix}"]`)).map(
    (input) => input.value,
  );

describe('MediaPerspectiveEditorView', () => {
  it('진보 관점이 비어 있어도 세 성향 칸이 그대로 유지된다', () => {
    const { container } = render(
      <MediaPerspectiveEditorView
        mediaPerspectives={[
          createPerspective(MediaLeaning.CENTRIST),
          createPerspective(MediaLeaning.CONSERVATIVE),
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: '진보' })).toBeInTheDocument();
    expect(readHiddenValues(container, '-leaning')).toEqual([
      MediaLeaning.PROGRESSIVE,
      MediaLeaning.CENTRIST,
      MediaLeaning.CONSERVATIVE,
    ]);
  });

  it('성향이 뒤섞여 저장돼 있어도 칸과 값이 어긋나지 않는다', () => {
    render(
      <MediaPerspectiveEditorView
        mediaPerspectives={[
          createPerspective(MediaLeaning.CONSERVATIVE),
          createPerspective(MediaLeaning.PROGRESSIVE),
        ]}
      />,
    );

    const frames = screen.getAllByLabelText('프레임') as HTMLInputElement[];

    expect(frames.map((input) => input.value)).toEqual([
      `${MediaLeaning.PROGRESSIVE} 프레임`,
      '',
      `${MediaLeaning.CONSERVATIVE} 프레임`,
    ]);
  });
});
