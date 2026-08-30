import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VotePanelView } from '@/components/issue/VotePanelView';
import { VoteChoice } from '@/domain/VoteChoice';

const ISSUE_ID = 'work-week-4-5';

const LOGIN_HREF = `/login?next=${encodeURIComponent(`/issues/${ISSUE_ID}#vote`)}`;

const LOGIN_NOTICE = '투표하려면 로그인이 필요해요';

const renderPanel = (overrides: Partial<ComponentProps<typeof VotePanelView>> = {}) => {
  const onVote = vi.fn();

  render(
    <VotePanelView
      issueId={ISSUE_ID}
      selectedChoice={null}
      onVote={onVote}
      isLoaded
      isAuthenticated
      loginHref={LOGIN_HREF}
      {...overrides}
    />,
  );

  return { onVote };
};

describe('VotePanelView', () => {
  it('찬성 · 아직 모르겠어요 · 반대 버튼을 순서대로 렌더링한다', () => {
    renderPanel();

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent('찬성');
    expect(buttons[1]).toHaveTextContent('아직 모르겠어요');
    expect(buttons[2]).toHaveTextContent('반대');
  });

  it('버튼을 누르면 해당 선택지로 onVote를 호출한다', async () => {
    const user = userEvent.setup();
    const { onVote } = renderPanel();

    await user.click(screen.getByRole('button', { name: '찬성' }));
    expect(onVote).toHaveBeenCalledWith(VoteChoice.AGREE);

    await user.click(screen.getByRole('button', { name: '아직 모르겠어요' }));
    expect(onVote).toHaveBeenCalledWith(VoteChoice.UNSURE);

    await user.click(screen.getByRole('button', { name: '반대' }));
    expect(onVote).toHaveBeenCalledWith(VoteChoice.DISAGREE);

    expect(onVote).toHaveBeenCalledTimes(3);
  });

  it('선택된 항목이 없으면 모든 버튼의 aria-pressed가 false다', () => {
    renderPanel();

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('선택된 버튼만 aria-pressed가 true다', () => {
    renderPanel({ selectedChoice: VoteChoice.DISAGREE });

    expect(screen.getByRole('button', { name: '반대' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '찬성' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '아직 모르겠어요' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('선택된 항목이 있으면 결과 보기 링크를 노출한다', () => {
    renderPanel({ selectedChoice: VoteChoice.AGREE });

    expect(screen.getByRole('link', { name: '결과 보기' })).toHaveAttribute(
      'href',
      `/issues/${ISSUE_ID}/result`,
    );
  });

  it('선택된 항목이 없으면 결과 보기 링크를 노출하지 않는다', () => {
    renderPanel();

    expect(screen.queryByRole('link', { name: '결과 보기' })).not.toBeInTheDocument();
  });

  it('로드 전에는 버튼을 비활성화한다', () => {
    renderPanel({ isLoaded: false });

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('로그인 상태에서는 로그인 안내 문구가 없다', () => {
    renderPanel();

    expect(screen.queryByText(LOGIN_NOTICE)).not.toBeInTheDocument();
  });
});

describe('VotePanelView 비로그인', () => {
  it('선택지 3개를 같은 순서의 로그인 링크로 보여준다', () => {
    renderPanel({ isAuthenticated: false });

    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAccessibleName('로그인 후 찬성 투표');
    expect(links[1]).toHaveAccessibleName('로그인 후 아직 모르겠어요 투표');
    expect(links[2]).toHaveAccessibleName('로그인 후 반대 투표');
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', LOGIN_HREF);
    });
  });

  it('투표 버튼 대신 로그인 안내 문구를 보여준다', () => {
    renderPanel({ isAuthenticated: false });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(LOGIN_NOTICE)).toBeInTheDocument();
  });

  it('이전 선택이 남아 있어도 결과 보기 링크를 노출하지 않는다', () => {
    renderPanel({ isAuthenticated: false, selectedChoice: VoteChoice.AGREE });

    expect(screen.queryByRole('link', { name: '결과 보기' })).not.toBeInTheDocument();
  });
});
