import { render, screen } from '@testing-library/react';

import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import type { AdminClaim, AdminEvidence } from '@/server/AdminStore';

import { ClaimEditorCardView } from './ClaimEditorCardView';

const noop = async () => {};

const createEvidence = (overrides: Partial<AdminEvidence> = {}): AdminEvidence => ({
  id: 'evidence-1',
  type: EvidenceType.FACT,
  source: '매체',
  date: new Date('2026-01-01T00:00:00.000Z'),
  summary: '근거 요약',
  url: 'https://example.com/1',
  support: null,
  verificationNote: null,
  ...overrides,
});

const createClaim = (evidences: AdminEvidence[]): AdminClaim => ({
  id: 'claim-1',
  side: ClaimSide.AGREE,
  order: 1,
  title: '찬성 주장',
  description: '설명',
  evidences,
});

const renderCard = (evidences: AdminEvidence[]) =>
  render(
    <ClaimEditorCardView
      claim={createClaim(evidences)}
      index={0}
      saveClaimAction={noop}
      updateEvidenceTypeAction={noop}
      deleteEvidenceAction={noop}
    />,
  );

describe('ClaimEditorCardView', () => {
  it('검증된 근거에는 판정 배지와 메모를 보여준다', () => {
    renderCard([
      createEvidence({
        support: EvidenceSupport.SUPPORTS,
        verificationNote: '주장을 직접 뒷받침한다.',
      }),
    ]);

    expect(screen.getByText('지지')).toBeInTheDocument();
    expect(screen.getByText('주장을 직접 뒷받침한다.')).toBeInTheDocument();
  });

  it('아직 검증되지 않은 근거에는 배지를 붙이지 않는다', () => {
    renderCard([createEvidence()]);

    expect(screen.queryByText('지지')).not.toBeInTheDocument();
    expect(screen.queryByText('무관')).not.toBeInTheDocument();
  });

  it('무관·반박 근거는 앱에 나가지 않는다는 이유를 툴팁으로 알린다', () => {
    const { container } = renderCard([
      createEvidence({ id: 'evidence-1', support: EvidenceSupport.UNRELATED }),
      createEvidence({ id: 'evidence-2', support: EvidenceSupport.CONTRADICTS }),
      createEvidence({ id: 'evidence-3', support: EvidenceSupport.SUPPORTS }),
    ]);

    expect(container.querySelectorAll('[title="앱에는 노출되지 않음"]')).toHaveLength(2);
  });

  it('무관·반박 근거도 삭제하지 않고 그대로 둔다', () => {
    renderCard([createEvidence({ support: EvidenceSupport.CONTRADICTS })]);

    expect(screen.getByText('근거 1개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
  });
});
