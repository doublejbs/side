'use client';

import { ClaimFeedbackView } from '@/components/claim/ClaimFeedbackView';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { useClaimFeedback } from '@/store/useClaimFeedback';

interface Props {
  claimId: string;
  /** 서버 저장(DB)이 켜져 있는지. 페이지가 알려준다. */
  isServerEnabled?: boolean;
}

export const ClaimFeedbackContainer = ({ claimId, isServerEnabled = false }: Props) => {
  const { feedback, isLoaded, error, toggleFeedback } = useClaimFeedback(claimId, {
    isServerEnabled,
  });

  const handleToggle = (next: ClaimFeedback) => {
    toggleFeedback(next);
  };

  return (
    <ClaimFeedbackView
      selected={feedback?.feedback ?? null}
      onToggle={handleToggle}
      isLoaded={isLoaded}
      hasSaveError={error !== null}
    />
  );
};
