import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VotePanelContainer } from '@/components/issue/VotePanelContainer';
import type { SessionUser } from '@/domain/SessionUser';
import { useSessionUser } from '@/store/useSessionUser';
import { resetVoteResults } from '@/store/VoteResultCache';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('@/store/useSessionUser', () => ({ useSessionUser: vi.fn() }));

const useSessionUserMock = vi.mocked(useSessionUser);

const SESSION_USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

/** 세션을 로그인 상태로 확정한다. 세션은 이제 컨테이너가 클라이언트에서 읽는다. */
const signIn = (): void => {
  useSessionUserMock.mockReturnValue({ user: SESSION_USER, isLoaded: true });
};

const fetchMock = vi.fn();

const ISSUE_ID = 'work-week-4-5';

const SAVE_ERROR_MESSAGE = '저장에 실패했어요. 다시 시도해 주세요.';

const LOGIN_HREF = `/login?next=${encodeURIComponent(`/issues/${ISSUE_ID}#vote`)}`;

const LOGIN_NOTICE = '투표하려면 로그인이 필요해요';

beforeEach(() => {
  window.localStorage.clear();
  resetVoteResults();
  pushMock.mockReset();
  useSessionUserMock.mockReset().mockReturnValue({ user: null, isLoaded: true });
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
    signIn();

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
    signIn();

    render(<VotePanelContainer issueId={ISSUE_ID} isServerEnabled />);

    await user.click(screen.getByRole('button', { name: '찬성' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('VotePanelContainer 비로그인', () => {
  it('서버 모드에서 세션이 없으면 선택지를 로그인 링크로 바꾼다', () => {
    render(<VotePanelContainer issueId={ISSUE_ID} isServerEnabled loginHref={LOGIN_HREF} />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: '로그인 후 찬성 투표' })).toHaveAttribute(
      'href',
      LOGIN_HREF,
    );
    expect(screen.getByText(LOGIN_NOTICE)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('세션을 읽기 전에는 선택지를 눌리지 않는 상태로 둔다', () => {
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: false });

    render(<VotePanelContainer issueId={ISSUE_ID} isServerEnabled loginHref={LOGIN_HREF} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled();
    });
    expect(screen.queryByText(LOGIN_NOTICE)).not.toBeInTheDocument();
  });

  it('목 모드에서는 세션이 없어도 게이트를 걸지 않는다', () => {
    render(<VotePanelContainer issueId={ISSUE_ID} loginHref={LOGIN_HREF} />);

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText(LOGIN_NOTICE)).not.toBeInTheDocument();
  });

  it('서버가 401 로 거절하면 저장 실패 대신 로그인 링크를 보여준다', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'LOGIN_REQUIRED' }),
    } as Response);
    signIn();

    render(<VotePanelContainer issueId={ISSUE_ID} isServerEnabled loginHref={LOGIN_HREF} />);

    await user.click(screen.getByRole('button', { name: '찬성' }));

    await waitFor(() => {
      expect(screen.getByText(LOGIN_NOTICE)).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인 후 찬성 투표' })).toHaveAttribute(
      'href',
      LOGIN_HREF,
    );
  });
});
