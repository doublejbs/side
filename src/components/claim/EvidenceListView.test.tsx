import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EvidenceListView } from '@/components/claim/EvidenceListView';
import { MockIssueRepository } from '@/data/MockIssueRepository';
import { EvidenceType } from '@/domain/EvidenceType';
import type { Evidence } from '@/domain/Issue';

const claim = await new MockIssueRepository().getClaimById('work-week-4-5', 'work-week-agree-1');

if (!claim) {
  throw new Error('테스트에 사용할 주장 목 데이터를 찾을 수 없습니다.');
}

const evidences: Evidence[] = claim.evidences;

describe('EvidenceListView', () => {
  it('근거 개수를 섹션 제목에 보여준다', () => {
    render(<EvidenceListView evidences={evidences} />);

    expect(
      screen.getByRole('heading', { name: `근거 ${evidences.length}개` }),
    ).toBeInTheDocument();
  });

  it('근거 수만큼 항목을 렌더한다', () => {
    render(<EvidenceListView evidences={evidences} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(evidences.length);
  });

  it('타입 배지를 영문 그대로 보여준다', () => {
    render(<EvidenceListView evidences={evidences} />);

    const items = screen.getAllByRole('listitem');

    evidences.forEach((evidence, index) => {
      expect(within(items[index]).getByText(evidence.type)).toBeInTheDocument();
    });
  });

  it('타입 배지에 한글 보조 라벨을 title로 제공한다', () => {
    const typed: Evidence[] = [
      { ...evidences[0], id: 'ev-fact', type: EvidenceType.FACT },
      { ...evidences[0], id: 'ev-research', type: EvidenceType.RESEARCH },
      { ...evidences[0], id: 'ev-expert', type: EvidenceType.EXPERT },
      { ...evidences[0], id: 'ev-claim', type: EvidenceType.CLAIM },
    ];

    render(<EvidenceListView evidences={typed} />);

    expect(screen.getByTitle('사실')).toHaveTextContent('FACT');
    expect(screen.getByTitle('연구')).toHaveTextContent('RESEARCH');
    expect(screen.getByTitle('전문가 의견')).toHaveTextContent('EXPERT');
    expect(screen.getByTitle('주장')).toHaveTextContent('CLAIM');
  });

  it('출처와 날짜, 요약을 보여준다', () => {
    render(<EvidenceListView evidences={evidences} />);

    const items = screen.getAllByRole('listitem');

    evidences.forEach((evidence, index) => {
      const item = items[index];

      expect(item).toHaveTextContent(`${evidence.source} · ${evidence.date}`);
      expect(within(item).getByText(evidence.summary)).toBeInTheDocument();
      expect(evidence.date).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    });
  });

  it('원문 보기 링크가 출처를 접근성 이름에 담고 새 탭으로 안전하게 열린다', () => {
    render(<EvidenceListView evidences={evidences} />);

    evidences.forEach((evidence) => {
      const link = screen.getByRole('link', { name: `${evidence.source} 원문 보기` });

      expect(link).toHaveAttribute('href', evidence.url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
