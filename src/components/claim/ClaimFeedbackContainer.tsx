'use client';

import { ClaimFeedbackView } from '@/components/claim/ClaimFeedbackView';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { useClaimFeedback } from '@/store/useClaimFeedback';
import { useSessionUser } from '@/store/useSessionUser';

interface Props {
  claimId: string;
  /** 서버 저장(DB)이 켜져 있는지. 페이지가 알려준다. */
  isServerEnabled?: boolean;
  /** 비로그인일 때 이동할 로그인 경로(`?next=` 포함). 서버가 slug 로 계산해 넘긴다. */
  loginHref?: string;
}

export const ClaimFeedbackContainer = ({
  claimId,
  isServerEnabled = false,
  loginHref = '/login',
}: Props) => {
  const { user, isLoaded: isSessionLoaded } = useSessionUser();
  const { feedback, isLoaded, error, isLoginRequired, toggleFeedback } = useClaimFeedback(claimId, {
    isServerEnabled,
  });

  /**
   * 목 모드는 로그인 없이 localStorage 에만 기록한다(개발 편의).
   * 세션은 클라이언트에서 읽으므로 판정 전에는 선택지를 눌리지 않는 상태로 둔다.
   */
  const isSessionPending = isServerEnabled && !isSessionLoaded;
  const canGiveFeedback = !isServerEnabled || (user !== null && !isLoginRequired);

  const handleToggle = (next: ClaimFeedback) => {
    toggleFeedback(next);
  };

  return (
    <ClaimFeedbackView
      selected={feedback?.feedback ?? null}
      onToggle={handleToggle}
      isLoaded={isLoaded && !isSessionPending}
      hasSaveError={error !== null && !isLoginRequired}
      isAuthenticated={canGiveFeedback || isSessionPending}
      loginHref={loginHref}
    />
  );
};
