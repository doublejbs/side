'use client';

import { ClaimFeedbackView } from '@/components/claim/ClaimFeedbackView';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { useClaimFeedback } from '@/store/useClaimFeedback';

interface Props {
  claimId: string;
}

export const ClaimFeedbackContainer = ({ claimId }: Props) => {
  const { feedback, isLoaded, toggleFeedback } = useClaimFeedback(claimId);

  const handleToggle = (next: ClaimFeedback) => {
    toggleFeedback(next);
  };

  return (
    <ClaimFeedbackView
      selected={feedback?.feedback ?? null}
      onToggle={handleToggle}
      isLoaded={isLoaded}
    />
  );
};
