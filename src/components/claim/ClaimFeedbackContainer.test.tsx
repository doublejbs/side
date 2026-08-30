import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClaimFeedbackContainer } from '@/components/claim/ClaimFeedbackContainer';

const fetchMock = vi.fn();

const CLAIM_ID = 'work-week-agree-1';

const SAVE_ERROR_MESSAGE = '저장에 실패했어요. 다시 시도해 주세요.';

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClaimFeedbackContainer', () => {
  it('목 모드에서는 서버를 부르지 않고 선택만 저장한다', async () => {
    const user = userEvent.setup();

    render(<ClaimFeedbackContainer claimId={CLAIM_ID} />);

    await user.click(screen.getByRole('button', { name: '설득됐어요' }));

    expect(screen.getByRole('button', { name: '설득됐어요' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('서버 저장이 500 으로 실패하면 안내 문구를 보여준다', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);

    render(<ClaimFeedbackContainer claimId={CLAIM_ID} isServerEnabled />);

    await user.click(screen.getByRole('button', { name: '설득됐어요' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(SAVE_ERROR_MESSAGE);
    });
    expect(screen.getByRole('button', { name: '설득됐어요' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
