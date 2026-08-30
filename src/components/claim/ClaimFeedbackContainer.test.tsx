import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClaimFeedbackContainer } from '@/components/claim/ClaimFeedbackContainer';
import type { SessionUser } from '@/domain/SessionUser';
import { useSessionUser } from '@/store/useSessionUser';

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

const CLAIM_ID = 'work-week-agree-1';

const SAVE_ERROR_MESSAGE = '저장에 실패했어요. 다시 시도해 주세요.';

const LOGIN_HREF = '/login?next=%2Fissues%2Fwork-week-4-5%2Fclaims%2Fwork-week-agree-1%23feedback';

const LOGIN_NOTICE = '피드백을 남기려면 로그인이 필요해요';

beforeEach(() => {
  window.localStorage.clear();
  useSessionUserMock.mockReset().mockReturnValue({ user: null, isLoaded: true });
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
    signIn();

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

describe('ClaimFeedbackContainer 비로그인', () => {
  it('서버 모드에서 세션이 없으면 선택지를 로그인 링크로 바꾼다', () => {
    render(<ClaimFeedbackContainer claimId={CLAIM_ID} isServerEnabled loginHref={LOGIN_HREF} />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: '로그인 후 설득됐어요 선택' })).toHaveAttribute(
      'href',
      LOGIN_HREF,
    );
    expect(screen.getByText(LOGIN_NOTICE)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('세션을 읽기 전에는 선택지를 눌리지 않는 상태로 둔다', () => {
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: false });

    render(<ClaimFeedbackContainer claimId={CLAIM_ID} isServerEnabled loginHref={LOGIN_HREF} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled();
    });
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

    render(<ClaimFeedbackContainer claimId={CLAIM_ID} isServerEnabled loginHref={LOGIN_HREF} />);

    await user.click(screen.getByRole('button', { name: '설득됐어요' }));

    await waitFor(() => {
      expect(screen.getByText(LOGIN_NOTICE)).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
