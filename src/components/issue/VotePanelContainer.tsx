'use client';

import { useRouter } from 'next/navigation';

import { VotePanelView } from '@/components/issue/VotePanelView';
import { VoteChoice } from '@/domain/VoteChoice';
import { useVote } from '@/store/useVote';

interface Props {
  issueId: string;
}

export const VotePanelContainer = ({ issueId }: Props) => {
  const router = useRouter();
  const { vote, isLoaded, castVote } = useVote(issueId);

  /** 이미 투표한 경우에도 선택을 바꾼 뒤 동일하게 결과 화면으로 이동한다. */
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
    />
  );
};
