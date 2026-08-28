import { CheckIcon } from '@/components/common/icons/CheckIcon';
import { ClaimFeedback } from '@/domain/ClaimFeedback';

import styles from './ClaimFeedbackOptionView.module.css';

interface Props {
  feedback: ClaimFeedback;
  label: string;
  isSelected: boolean;
  isLoaded: boolean;
  onToggle: (feedback: ClaimFeedback) => void;
}

export const ClaimFeedbackOptionView = ({
  feedback,
  label,
  isSelected,
  isLoaded,
  onToggle,
}: Props) => {
  const handleClick = () => {
    onToggle(feedback);
  };

  return (
    <button
      type="button"
      className={`${styles.option} ${isSelected ? styles.selected : ''}`}
      aria-pressed={isSelected}
      disabled={!isLoaded}
      onClick={handleClick}
    >
      {label}
      {isSelected ? <CheckIcon size={16} /> : null}
    </button>
  );
};
