'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { VoteChoice } from '@/domain/VoteChoice';
import type { VoteRecord } from '@/domain/UserRecord';
import type { VoteResultResponse } from '@/domain/VoteApiTypes';
import { isLoginRequiredError } from '@/store/LoginRequiredError';
import { toStoreError } from '@/store/toStoreError';
import {
  getServerUserRecordVersion,
  getUserRecordVersion,
  getVote,
  restoreVote,
  setVote,
  subscribeUserRecord,
} from '@/store/UserRecordStore';
import { castVoteRequest } from '@/store/VoteApiClient';
import {
  getServerVoteResultVersion,
  getVoteResult,
  getVoteResultError,
  getVoteResultVersion,
  nextVoteRequestSeq,
  publishVoteResult,
  subscribeVoteResult,
} from '@/store/VoteResultCache';

interface UseVoteOptions {
  /** 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준다. */
  isServerEnabled?: boolean;
}

interface UseVoteResult {
  vote: VoteRecord | null;
  isLoaded: boolean;
  /** 서버가 집계한 분포. 아직 받아오지 못했으면 null. */
  serverResult: VoteResultResponse | null;
  /** 서버 저장·조회에 실패했을 때의 오류. 내 선택은 로컬에 남는다. */
  error: Error | null;
  /** 오류가 "로그인이 필요해요"(401)인지. 화면은 저장 실패 대신 로그인 안내를 보여준다. */
  isLoginRequired: boolean;
  castVote: (choice: VoteChoice) => VoteRecord;
}

const CAST_VOTE_ERROR_MESSAGE = '투표를 서버에 저장하지 못했어요';

export const useVote = (
  issueId: string,
  { isServerEnabled = false }: UseVoteOptions = {},
): UseVoteResult => {
  const version = useSyncExternalStore(
    subscribeUserRecord,
    getUserRecordVersion,
    getServerUserRecordVersion,
  );
  const resultVersion = useSyncExternalStore(
    subscribeVoteResult,
    getVoteResultVersion,
    getServerVoteResultVersion,
  );
  const [castError, setCastError] = useState<Error | null>(null);

  const vote = useMemo(() => (version > 0 ? getVote(issueId) : null), [issueId, version]);
  const serverResult = useMemo(
    () => (isServerEnabled && resultVersion > 0 ? getVoteResult(issueId) : null),
    [isServerEnabled, issueId, resultVersion],
  );
  const serverError = useMemo(
    () => (isServerEnabled && resultVersion > 0 ? getVoteResultError(issueId) : null),
    [isServerEnabled, issueId, resultVersion],
  );
  const isLoaded = version > 0;

  /** 내 선택은 먼저 로컬에 기록해 화면을 즉시 갱신하고, 서버 응답은 도착하는 대로 분포를 덮어쓴다. */
  const castVote = useCallback(
    (choice: VoteChoice): VoteRecord => {
      const previous = getVote(issueId);
      const record = setVote(issueId, choice);

      if (isServerEnabled) {
        const seq = nextVoteRequestSeq();

        setCastError(null);
        castVoteRequest(issueId, choice)
          .then((result) => publishVoteResult(issueId, result, seq))
          .catch((reason: unknown) => {
            // 로그인이 필요해 거절된 표는 로컬에도 남기지 않는다.
            if (isLoginRequiredError(reason)) {
              restoreVote(issueId, previous);
            }

            setCastError(toStoreError(reason, CAST_VOTE_ERROR_MESSAGE));
          });
      }

      return record;
    },
    [isServerEnabled, issueId],
  );

  const error = castError ?? serverError;

  return {
    vote,
    isLoaded,
    serverResult,
    error,
    isLoginRequired: isLoginRequiredError(error),
    castVote,
  };
};
