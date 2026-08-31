import { render, screen } from '@testing-library/react';

import { AxisDirection } from '@/domain/AxisDirection';
import type { IssueClassification } from '@/domain/IssueClassification';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

import { IssueClassificationCardView } from './IssueClassificationCardView';

const createClassification = (
  overrides: Partial<IssueClassification> = {},
): IssueClassification => ({
  isPolicyDebate: true,
  debateScore: 82,
  topic: '노동',
  reason: '정년 연장은 찬반이 갈리는 정책 사안이다.',
  entities: ['고용노동부', '한국노총'],
  keySentences: ['정년 연장 논의가 본격화됐다.', '재정 부담이 쟁점이다.'],
  keyClaims: ['정년을 연장해야 한다.', '청년 고용이 줄어든다.'],
  ...overrides,
});

const renderCard = (classification: IssueClassification | null) =>
  render(
    <IssueClassificationCardView
      classification={classification}
      debateScore={classification ? 82 : null}
      topic={classification ? '노동' : null}
      classifiedAt={new Date('2026-01-02T00:00:00.000Z')}
      verifiedAt={new Date('2026-01-03T00:00:00.000Z')}
    />,
  );

describe('IssueClassificationCardView', () => {
  it('점수·주제·판정 근거와 핵심 문장·주장·인물을 보여준다', () => {
    renderCard(createClassification());

    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('노동')).toBeInTheDocument();
    expect(screen.getByText('정년 연장은 찬반이 갈리는 정책 사안이다.')).toBeInTheDocument();
    expect(screen.getByText('정년 연장 논의가 본격화됐다.')).toBeInTheDocument();
    expect(screen.getByText('정년을 연장해야 한다.')).toBeInTheDocument();
    expect(screen.getByText('고용노동부')).toBeInTheDocument();
  });

  it('분류·검증 시각을 함께 적는다', () => {
    renderCard(createClassification());

    expect(screen.getByText('분류 2026.01.02 · 검증 2026.01.03')).toBeInTheDocument();
  });

  it('중복 후보가 있으면 그 이슈로 가는 링크를 붙인다', () => {
    renderCard(createClassification({ duplicateOfIssueId: 'issue-9' }));

    expect(screen.getByRole('link', { name: '중복 후보 이슈 열기' })).toHaveAttribute(
      'href',
      '/admin/issues/issue-9',
    );
  });

  it('중복 후보가 없으면 경고를 붙이지 않는다', () => {
    renderCard(createClassification());

    expect(screen.queryByRole('link', { name: '중복 후보 이슈 열기' })).not.toBeInTheDocument();
  });

  it('분류가 제안한 축을 방향 라벨과 함께 읽기 전용으로 보여준다', () => {
    renderCard(
      createClassification({
        axes: [
          { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT },
          { axis: PerspectiveAxis.ECONOMY, agreeDirection: AxisDirection.LEFT },
        ],
      }),
    );

    expect(screen.getByText('제안 축')).toBeInTheDocument();
    expect(screen.getByText('노동 · 찬성이면 노동자 중심')).toBeInTheDocument();
    expect(screen.getByText('경제 · 찬성이면 시장 중심')).toBeInTheDocument();
  });

  it('제안 축이 없으면 축 영역을 생략한다', () => {
    renderCard(createClassification({ axes: [] }));

    expect(screen.queryByText('제안 축')).not.toBeInTheDocument();
  });

  it('아직 분류되지 않았으면 안내만 보여준다', () => {
    renderCard(null);

    expect(screen.getByText('아직 분류되지 않음')).toBeInTheDocument();
  });
});
