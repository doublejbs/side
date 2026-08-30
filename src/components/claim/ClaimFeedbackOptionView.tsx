import Link from 'next/link';

import { joinClassNames } from '@/components/common/joinClassNames';
import { CheckIcon } from '@/components/common/icons/CheckIcon';
import { ClaimFeedback } from '@/domain/ClaimFeedback';

import styles from './ClaimFeedbackOptionView.module.css';

interface Props {
  feedback: ClaimFeedback;
  label: string;
  isSelected: boolean;
  isLoaded: boolean;
  onToggle: (feedback: ClaimFeedback) => void;
  /** 로그인 상태. false 면 선택지가 피드백 대신 로그인으로 이동한다. */
  isAuthenticated: boolean;
  /** 비로그인일 때 선택지가 이동할 로그인 경로. */
  loginHref: string;
}

export const ClaimFeedbackOptionView = ({
  feedback,
  label,
  isSelected,
  isLoaded,
  onToggle,
  isAuthenticated,
  loginHref,
}: Props) => {
  const className = joinClassNames(styles.option, isSelected && styles.selected);

  // 비로그인 상태에서도 선택지는 같은 모습으로 보이고, 누르면 로그인으로 이동한다.
  if (!isAuthenticated) {
    return (
      <Link className={className} href={loginHref} aria-label={`로그인 후 ${label} 선택`}>
        {label}
      </Link>
    );
  }

  const handleClick = () => {
    onToggle(feedback);
  };

  return (
    <button
      type="button"
      className={className}
      aria-pressed={isSelected}
      disabled={!isLoaded}
      onClick={handleClick}
    >
      {label}
      {isSelected ? <CheckIcon size={16} /> : null}
    </button>
  );
};
