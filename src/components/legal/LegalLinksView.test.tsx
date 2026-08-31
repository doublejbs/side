import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LegalLinksView } from '@/components/legal/LegalLinksView';

describe('LegalLinksView', () => {
  it('이용약관과 개인정보처리방침 링크를 보여준다', () => {
    render(<LegalLinksView />);

    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });
});
