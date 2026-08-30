import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MediaPerspectiveView } from '@/components/issue/MediaPerspectiveView';
import { MediaLeaning } from '@/domain/MediaLeaning';

const mockPerspectives = [
  {
    leaning: MediaLeaning.PROGRESSIVE,
    articleCount: 10,
    frame: '진보 성향의 프레임',
    keywords: ['키워드1', '키워드2'],
    representativeArticle: {
      title: '진보 대표 기사',
      source: '진보 매체',
      url: 'https://example.com/progressive',
    },
  },
  {
    leaning: MediaLeaning.CENTRIST,
    articleCount: 8,
    frame: '중도 성향의 프레임',
    keywords: ['키워드3', '키워드4'],
    representativeArticle: {
      title: '중도 대표 기사',
      source: '중도 매체',
      url: 'https://example.com/centrist',
    },
  },
];

const mockCommonCoverage = ['공통 내용 1', '공통 내용 2'];

describe('MediaPerspectiveView', () => {
  it('언론 관점이 없으면 렌더하지 않는다', () => {
    const { container } = render(
      <MediaPerspectiveView
        perspectives={[]}
        commonCoverage={mockCommonCoverage}
        mediaOutletCount={0}
        coveragePeriodLabel="최근 2주"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('있으면 제목·성향 카드·공통 내용을 렌더한다', () => {
    render(
      <MediaPerspectiveView
        perspectives={mockPerspectives}
        commonCoverage={mockCommonCoverage}
        mediaOutletCount={12}
        coveragePeriodLabel="최근 2주"
      />,
    );

    // 제목 확인
    expect(
      screen.getByRole('heading', { name: '언론은 어떻게 다르게 보도했을까요?' }),
    ).toBeInTheDocument();

    // 서브텍스트 확인
    expect(screen.getByText(/최근 2주 · 12개 매체 · 분석 기사 18건/)).toBeInTheDocument();

    // 성향 카드 확인
    expect(screen.getByText('진보 성향 매체')).toBeInTheDocument();
    expect(screen.getByText('중도 성향 매체')).toBeInTheDocument();

    // 기사 수 확인
    expect(screen.getByText('기사 10건')).toBeInTheDocument();

    // 프레임 확인
    expect(screen.getByText('진보 성향의 프레임')).toBeInTheDocument();
    expect(screen.getByText('중도 성향의 프레임')).toBeInTheDocument();

    // 키워드 확인
    expect(screen.getByText('키워드1')).toBeInTheDocument();
    expect(screen.getByText('키워드3')).toBeInTheDocument();

    // 공통 내용 확인
    expect(screen.getByText('공통적으로 다룬 내용')).toBeInTheDocument();
    expect(screen.getByText('공통 내용 1')).toBeInTheDocument();
    expect(screen.getByText('공통 내용 2')).toBeInTheDocument();
  });
});
