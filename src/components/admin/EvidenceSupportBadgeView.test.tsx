import { render, screen } from '@testing-library/react';

import { EvidenceSupport } from '@/domain/EvidenceSupport';

import { EvidenceSupportBadgeView } from './EvidenceSupportBadgeView';

describe('EvidenceSupportBadgeView', () => {
  it('판정마다 한글 이름을 보여준다', () => {
    const labels: [EvidenceSupport, string][] = [
      [EvidenceSupport.SUPPORTS, '지지'],
      [EvidenceSupport.PARTIAL, '부분'],
      [EvidenceSupport.UNRELATED, '무관'],
      [EvidenceSupport.CONTRADICTS, '반박'],
    ];

    for (const [support, label] of labels) {
      const view = render(<EvidenceSupportBadgeView support={support} />);

      expect(screen.getByText(label)).toBeInTheDocument();

      view.unmount();
    }
  });
});
