'use client';

import { useEffect } from 'react';

import { toStoreError } from '@/store/toStoreError';
import { getVote } from '@/store/UserRecordStore';
import { fetchMyVote } from '@/store/VoteApiClient';
import {
  nextVoteRequestSeq,
  publishVoteResult,
  publishVoteResultError,
} from '@/store/VoteResultCache';

const FETCH_ERROR_MESSAGE = '투표 분포를 받아오지 못했어요';

/** 내 선택이 아직 반영되지 않은 응답을 받았을 때 다시 물어보기까지 기다리는 시간. */
const RETRY_DELAY_MS = 500;

/**
 * 서버 모드에서 마운트할 때마다 현재 분포를 다시 받아온다(오래된 분포 고착 방지).
 * 응답은 `VoteResultCache` 에 쓰고, 화면은 `useVote` 의 구독으로 갱신된다.
 * 요청 순번을 먼저 받아 두므로 늦게 도착한 응답이 더 최근 투표 결과를 덮어쓰지 않는다.
 *
 * 방금 던진 표가 아직 보이지 않는 응답(익명 쿠키 발급 직후·집계 지연)이 올 수 있어,
 * 로컬에 투표 기록이 있는데 서버가 `myChoice: null` 을 주면 **한 번만** 다시 조회한다.
 * (이 훅은 상태를 직접 갖지 않으므로 effect 안에서 setState 를 하지 않는다.)
 */
export const useServerVoteSync = (issueId: string, isServerEnabled: boolean): void => {
  useEffect(() => {
    if (!isServerEnabled) {
      return;
    }

    let isActive = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const load = (canRetry: boolean): void => {
      const seq = nextVoteRequestSeq();

      fetchMyVote(issueId)
        .then((result) => {
          if (!isActive) {
            return;
          }

          publishVoteResult(issueId, result, seq);

          if (canRetry && result.myChoice === null && getVote(issueId) !== null) {
            retryTimer = setTimeout(() => load(false), RETRY_DELAY_MS);
          }
        })
        .catch((reason: unknown) => {
          if (isActive) {
            publishVoteResultError(issueId, toStoreError(reason, FETCH_ERROR_MESSAGE), seq);
          }
        });
    };

    load(true);

    return () => {
      isActive = false;
      clearTimeout(retryTimer);
    };
  }, [isServerEnabled, issueId]);
};
