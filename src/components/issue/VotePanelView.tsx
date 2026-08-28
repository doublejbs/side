import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { CheckIcon } from '@/components/common/icons/CheckIcon';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceLabel } from '@/domain/voteChoiceLabel';

import styles from './VotePanelView.module.css';

interface Props {
  issueId: string;
  selectedChoice: VoteChoice | null;
  onVote: (choice: VoteChoice) => void;
  isLoaded: boolean;
}

/** 찬성 · 아직 모르겠어요 · 반대를 항상 같은 크기로 같은 순서에 배치한다. */
const CHOICE_ORDER: VoteChoice[] = [VoteChoice.AGREE, VoteChoice.UNSURE, VoteChoice.DISAGREE];

const SELECTED_CLASS: Record<VoteChoice, string> = {
  [VoteChoice.AGREE]: styles.selectedAgree,
  [VoteChoice.UNSURE]: styles.selectedUnsure,
  [VoteChoice.DISAGREE]: styles.selectedDisagree,
};

export const VotePanelView = ({ issueId, selectedChoice, onVote, isLoaded }: Props) => (
  <CardView as={CardElement.SECTION} id="vote" className={styles.card}>
    <h2 className={styles.title}>지금 당신의 생각은?</h2>
    <p className={styles.subtitle}>
      모든 정보를 확인한 뒤 편하게 골라주세요. 모르겠다는 것도 하나의 의견이에요.
    </p>

    <div className={styles.choices} aria-busy={!isLoaded}>
      {CHOICE_ORDER.map((choice) => {
        const isSelected = selectedChoice === choice;
        const className = [styles.choiceButton, isSelected ? SELECTED_CLASS[choice] : '']
          .filter(Boolean)
          .join(' ');

        const handleClick = () => {
          onVote(choice);
        };

        return (
          <button
            key={choice}
            type="button"
            className={className}
            aria-pressed={isSelected}
            disabled={!isLoaded}
            onClick={handleClick}
          >
            <span>{getVoteChoiceLabel(choice)}</span>
            {isSelected ? <CheckIcon size={18} /> : null}
          </button>
        );
      })}
    </div>

    {selectedChoice ? (
      <ArrowLinkView className={styles.resultLink} href={`/issues/${issueId}/result`}>
        결과 보기
      </ArrowLinkView>
    ) : null}
  </CardView>
);
