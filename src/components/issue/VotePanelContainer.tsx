'use client';

import { useRouter } from 'next/navigation';

import { VotePanelView } from '@/components/issue/VotePanelView';
import { VoteChoice } from '@/domain/VoteChoice';
import { useSessionUser } from '@/store/useSessionUser';
import { useVote } from '@/store/useVote';

interface Props {
  issueId: string;
  /** 서버 저장(DB)이 켜져 있는지. 페이지가 알려준다. */
  isServerEnabled?: boolean;
  /** 비로그인일 때 이동할 로그인 경로(`?next=` 포함). 서버가 slug 로 계산해 넘긴다. */
  loginHref?: string;
}

export const VotePanelContainer = ({
  issueId,
  isServerEnabled = false,
  loginHref = '/login',
}: Props) => {
  const router = useRouter();
  const { user, isLoaded: isSessionLoaded } = useSessionUser();
  const { vote, isLoaded, error, isLoginRequired, castVote } = useVote(issueId, {
    isServerEnabled,
  });

  /**
   * 목 모드(`isServerEnabled === false`)는 로그인 없이 localStorage 에만 기록한다(개발 편의).
   * 서버 모드에서는 세션이 없거나 요청이 401 로 거절되면 선택지를 로그인 링크로 바꾼다.
   * 세션은 클라이언트에서 읽으므로(공개 화면 정적 렌더 유지) 판정 전에는 아직 결론을 내지 않는다.
   */
  const isSessionPending = isServerEnabled && !isSessionLoaded;
  const canVote = !isServerEnabled || (user !== null && !isLoginRequired);

  /**
   * 이미 투표한 경우에도 선택을 바꾼 뒤 동일하게 결과 화면으로 이동한다.
   * 서버 저장은 낙관적으로 처리하므로 응답을 기다리지 않는다.
   */
  const handleVote = (choice: VoteChoice) => {
    castVote(choice);
    router.push(`/issues/${issueId}/result`);
  };

  return (
    <VotePanelView
      issueId={issueId}
      selectedChoice={vote?.choice ?? null}
      onVote={handleVote}
      isLoaded={isLoaded && !isSessionPending}
      hasSaveError={error !== null && !isLoginRequired}
      isAuthenticated={canVote || isSessionPending}
      loginHref={loginHref}
    />
  );
};
