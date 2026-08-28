import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ClaimFeedbackView } from '@/components/claim/ClaimFeedbackView';
import { ClaimFeedback } from '@/domain/ClaimFeedback';

describe('ClaimFeedbackView', () => {
  it('피드백 버튼 3개를 보여준다', () => {
    render(<ClaimFeedbackView selected={null} onToggle={vi.fn()} isLoaded />);

    expect(screen.getByRole('button', { name: '설득됐어요' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설득되지 않았어요' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '근거가 부족해요' })).toBeInTheDocument();
  });

  it('버튼을 누르면 해당 피드백으로 onToggle을 호출한다', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();

    render(<ClaimFeedbackView selected={null} onToggle={handleToggle} isLoaded />);

    await user.click(screen.getByRole('button', { name: '설득됐어요' }));
    expect(handleToggle).toHaveBeenCalledWith(ClaimFeedback.PERSUADED);

    await user.click(screen.getByRole('button', { name: '설득되지 않았어요' }));
    expect(handleToggle).toHaveBeenCalledWith(ClaimFeedback.NOT_PERSUADED);

    await user.click(screen.getByRole('button', { name: '근거가 부족해요' }));
    expect(handleToggle).toHaveBeenCalledWith(ClaimFeedback.LACKS_EVIDENCE);

    expect(handleToggle).toHaveBeenCalledTimes(3);
  });

  it('선택된 버튼만 aria-pressed가 true다', () => {
    render(
      <ClaimFeedbackView selected={ClaimFeedback.LACKS_EVIDENCE} onToggle={vi.fn()} isLoaded />,
    );

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
    render(<ClaimFeedbackView selected={null} onToggle={vi.fn()} isLoaded />);

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('아직 로드되지 않았으면 버튼을 비활성화한다', () => {
    render(<ClaimFeedbackView selected={null} onToggle={vi.fn()} isLoaded={false} />);

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
