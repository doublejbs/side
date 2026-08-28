import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VotePanelContainer } from '@/components/issue/VotePanelContainer';
import { resetVoteResults } from '@/store/VoteResultCache';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const fetchMock = vi.fn();

const ISSUE_ID = 'work-week-4-5';

const SAVE_ERROR_MESSAGE = '저장에 실패했어요. 다시 시도해 주세요.';

beforeEach(() => {
  window.localStorage.clear();
  resetVoteResults();
  pushMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('VotePanelContainer', () => {
  it('투표하면 결과 화면으로 이동한다', async () => {
    const user = userEvent.setup();

    render(<VotePanelContainer issueId={ISSUE_ID} />);

    await user.click(screen.getByRole('button', { name: '찬성' }));

    expect(pushMock).toHaveBeenCalledWith(`/issues/${ISSUE_ID}/result`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('서버 저장이 500 으로 실패하면 안내 문구를 보여준다', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);

    render(<VotePanelContainer issueId={ISSUE_ID} isServerEnabled />);

    await user.click(screen.getByRole('button', { name: '찬성' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(SAVE_ERROR_MESSAGE);
    });
    // 서버 저장에 실패해도 내 선택은 로컬에 남는다.
    expect(screen.getByRole('button', { name: /찬성/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('서버 저장에 성공하면 안내 문구가 없다', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        slug: ISSUE_ID,
        distribution: { agree: 60, disagree: 30, unsure: 10 },
        participantCount: 10,
        myChoice: 'AGREE',
      }),
    } as Response);

    render(<VotePanelContainer issueId={ISSUE_ID} isServerEnabled />);

    await user.click(screen.getByRole('button', { name: '찬성' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
