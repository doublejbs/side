'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { ClaimFeedbackRecord } from '@/domain/UserRecord';
import {
  getClaimFeedback,
  getServerUserRecordVersion,
  getUserRecordVersion,
  setClaimFeedback,
  subscribeUserRecord,
} from '@/store/UserRecordStore';

interface UseClaimFeedbackResult {
  feedback: ClaimFeedbackRecord | null;
  isLoaded: boolean;
  toggleFeedback: (feedback: ClaimFeedback) => ClaimFeedbackRecord | null;
}

export const useClaimFeedback = (claimId: string): UseClaimFeedbackResult => {
  const version = useSyncExternalStore(
    subscribeUserRecord,
    getUserRecordVersion,
    getServerUserRecordVersion,
  );

  const feedback = useMemo(
    () => (version > 0 ? getClaimFeedback(claimId) : null),
    [claimId, version],
  );
  const isLoaded = version > 0;

  const toggleFeedback = useCallback(
    (next: ClaimFeedback): ClaimFeedbackRecord | null => {
      const current = getClaimFeedback(claimId);

      return setClaimFeedback(claimId, current?.feedback === next ? null : next);
    },
    [claimId],
  );

  return { feedback, isLoaded, toggleFeedback };
};
