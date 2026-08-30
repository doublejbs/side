'use client';

import { SimilarGroupView } from '@/components/discover/SimilarGroupView';
import type { OpinionGroupSummary } from '@/domain/OpinionGroupSummary';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { useSessionUser } from '@/store/useSessionUser';
import { useUserVotes } from '@/store/useUserVotes';

interface Props {
  group: OpinionGroupSummary;
  /** 비로그인이라 내 투표를 쓸 수 없을 때의 로그인 경로. 서버가 계산해 넘긴다. */
  loginHref: string;
}

export const SimilarGroupContainer = ({ group, loginHref }: Props) => {
  const { user, isLoaded } = useSessionUser();
  const votes = useUserVotes();

  // 세션은 클라이언트에서 읽는다(공개 화면 정적 렌더 유지). 판정이 끝난 뒤에만 안내로 바꾼다.
  if (isAuthEnabled() && isLoaded && !user) {
    return <SimilarGroupView group={group} votedCount={0} loginHref={loginHref} />;
  }

  return <SimilarGroupView group={group} votedCount={Object.keys(votes).length} />;
};
