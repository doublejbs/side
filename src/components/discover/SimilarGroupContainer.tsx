'use client';

import { SimilarGroupView } from '@/components/discover/SimilarGroupView';
import type { OpinionGroupSummary } from '@/domain/OpinionGroupSummary';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { useMyVotes } from '@/store/useMyVotes';
import { useSessionUser } from '@/store/useSessionUser';
import { useUserVotes } from '@/store/useUserVotes';

import styles from './SimilarGroupContainer.module.css';

interface Props {
  group: OpinionGroupSummary;
  /** 비로그인이라 내 투표를 쓸 수 없을 때의 로그인 경로. 서버가 계산해 넘긴다. */
  loginHref: string;
  /** 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준다. */
  isServerEnabled?: boolean;
}

/** 참여한 이슈 수는 서버 모드에서 `userId` 기준 서버 집계를, 목 모드에서 localStorage 기록을 쓴다. */
export const SimilarGroupContainer = ({ group, loginHref, isServerEnabled = false }: Props) => {
  const { user, isLoaded } = useSessionUser();
  const { votes: myVotes, isLoaded: isMyVotesLoaded } = useMyVotes(isServerEnabled);
  const localVotes = useUserVotes();
  const votedCount = isServerEnabled ? myVotes?.length ?? 0 : Object.keys(localVotes).length;

  // 세션은 클라이언트에서 읽는다(공개 화면 정적 렌더 유지). 판정이 끝난 뒤에만 안내로 바꾼다.
  if (isAuthEnabled() && isLoaded && !user) {
    return <SimilarGroupView group={group} votedCount={0} loginHref={loginHref} />;
  }

  // 서버 집계가 오기 전에 "참여한 이슈가 없다" 고 단정하지 않는다.
  if (isServerEnabled && !isMyVotesLoaded) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  return <SimilarGroupView group={group} votedCount={votedCount} />;
};
