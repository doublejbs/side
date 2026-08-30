import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ClaimFeedbackView } from '@/components/claim/ClaimFeedbackView';
import { ClaimFeedback } from '@/domain/ClaimFeedback';

const LOGIN_HREF = '/login?next=%2Fissues%2Fwork-week-4-5%2Fclaims%2Fc1%23feedback';

const LOGIN_NOTICE = '피드백을 남기려면 로그인이 필요해요';

const renderFeedback = (overrides: Partial<ComponentProps<typeof ClaimFeedbackView>> = {}) => {
  const onToggle = vi.fn();

  render(
    <ClaimFeedbackView
      selected={null}
      onToggle={onToggle}
      isLoaded
      isAuthenticated
      loginHref={LOGIN_HREF}
      {...overrides}
    />,
  );

  return { onToggle };
};

describe('ClaimFeedbackView', () => {
  it('피드백 버튼 3개를 보여준다', () => {
    renderFeedback();

    expect(screen.getByRole('button', { name: '설득됐어요' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설득되지 않았어요' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '근거가 부족해요' })).toBeInTheDocument();
  });

  it('버튼을 누르면 해당 피드백으로 onToggle을 호출한다', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderFeedback();

    await user.click(screen.getByRole('button', { name: '설득됐어요' }));
    expect(onToggle).toHaveBeenCalledWith(ClaimFeedback.PERSUADED);

    await user.click(screen.getByRole('button', { name: '설득되지 않았어요' }));
    expect(onToggle).toHaveBeenCalledWith(ClaimFeedback.NOT_PERSUADED);

    await user.click(screen.getByRole('button', { name: '근거가 부족해요' }));
    expect(onToggle).toHaveBeenCalledWith(ClaimFeedback.LACKS_EVIDENCE);

    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('선택된 버튼만 aria-pressed가 true다', () => {
    renderFeedback({ selected: ClaimFeedback.LACKS_EVIDENCE });

    expect(screen.getByRole('button', { name: '근거가 부족해요' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '설득됐어요' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: '설득되지 않았어요' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('선택된 값이 없으면 모든 버튼이 눌리지 않은 상태다', () => {
    renderFeedback();

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('아직 로드되지 않았으면 버튼을 비활성화한다', () => {
    renderFeedback({ isLoaded: false });

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});

describe('ClaimFeedbackView 비로그인', () => {
  it('선택지 3개를 로그인 링크로 보여준다', () => {
    renderFeedback({ isAuthenticated: false });

    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAccessibleName('로그인 후 설득됐어요 선택');
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', LOGIN_HREF);
    });
  });

  it('피드백 버튼 대신 로그인 안내 문구를 보여준다', () => {
    renderFeedback({ isAuthenticated: false });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(LOGIN_NOTICE)).toBeInTheDocument();
  });
});
