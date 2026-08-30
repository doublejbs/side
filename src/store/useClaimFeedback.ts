'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { ClaimFeedbackRecord } from '@/domain/UserRecord';
import { isLoginRequiredError } from '@/store/LoginRequiredError';
import { toStoreError } from '@/store/toStoreError';
import {
  getClaimFeedback,
  getServerUserRecordVersion,
  getUserRecordVersion,
  setClaimFeedback,
  subscribeUserRecord,
} from '@/store/UserRecordStore';
import { sendClaimFeedback } from '@/store/VoteApiClient';

interface UseClaimFeedbackOptions {
  /** 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준다. */
  isServerEnabled?: boolean;
}

interface UseClaimFeedbackResult {
  feedback: ClaimFeedbackRecord | null;
  isLoaded: boolean;
  /** 서버 저장에 실패했을 때의 오류. 내 선택은 로컬에 남는다. */
  error: Error | null;
  /** 오류가 "로그인이 필요해요"(401)인지. 화면은 저장 실패 대신 로그인 안내를 보여준다. */
  isLoginRequired: boolean;
  toggleFeedback: (feedback: ClaimFeedback) => ClaimFeedbackRecord | null;
}

const FEEDBACK_ERROR_MESSAGE = '피드백을 서버에 저장하지 못했어요';

export const useClaimFeedback = (
  claimId: string,
  { isServerEnabled = false }: UseClaimFeedbackOptions = {},
): UseClaimFeedbackResult => {
  const version = useSyncExternalStore(
    subscribeUserRecord,
    getUserRecordVersion,
    getServerUserRecordVersion,
  );
  const [error, setError] = useState<Error | null>(null);

  const feedback = useMemo(
    () => (version > 0 ? getClaimFeedback(claimId) : null),
    [claimId, version],
  );
  const isLoaded = version > 0;

  /** 로컬에 먼저 기록해 화면을 즉시 갱신하고, 서버에는 같은 값을 뒤이어 보낸다. */
  const toggleFeedback = useCallback(
    (next: ClaimFeedback): ClaimFeedbackRecord | null => {
      const previous = getClaimFeedback(claimId);
      const value = previous?.feedback === next ? null : next;
      const record = setClaimFeedback(claimId, value);

      if (isServerEnabled) {
        setError(null);
        sendClaimFeedback(claimId, value).catch((reason: unknown) => {
          // 로그인이 필요해 거절된 피드백은 로컬에도 남기지 않는다.
          if (isLoginRequiredError(reason)) {
            setClaimFeedback(claimId, previous?.feedback ?? null);
          }

          setError(toStoreError(reason, FEEDBACK_ERROR_MESSAGE));
        });
      }

      return record;
    },
    [claimId, isServerEnabled],
  );

  return {
    feedback,
    isLoaded,
    error,
    isLoginRequired: isLoginRequiredError(error),
    toggleFeedback,
  };
};
