'use client';

import { useRouter } from 'next/navigation';

import { VotePanelView } from '@/components/issue/VotePanelView';
import { VoteChoice } from '@/domain/VoteChoice';
import { useVote } from '@/store/useVote';

interface Props {
  issueId: string;
  /** 서버 저장(DB)이 켜져 있는지. 페이지가 알려준다. */
  isServerEnabled?: boolean;
}

export const VotePanelContainer = ({ issueId, isServerEnabled = false }: Props) => {
  const router = useRouter();
  const { vote, isLoaded, error, castVote } = useVote(issueId, { isServerEnabled });

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
      isLoaded={isLoaded}
      hasSaveError={error !== null}
    />
  );
};
