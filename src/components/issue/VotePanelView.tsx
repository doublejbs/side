import Link from 'next/link';

import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { joinClassNames } from '@/components/common/joinClassNames';
import { SaveErrorView } from '@/components/common/SaveErrorView';
import { CheckIcon } from '@/components/common/icons/CheckIcon';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceLabel } from '@/domain/voteChoiceLabel';

import styles from './VotePanelView.module.css';

interface Props {
  issueId: string;
  selectedChoice: VoteChoice | null;
  onVote: (choice: VoteChoice) => void;
  isLoaded: boolean;
  /** 서버 저장에 실패했는지. 실패해도 내 선택은 로컬에 남는다. */
  hasSaveError?: boolean;
  /** 로그인 상태. false 면 선택지가 투표 대신 로그인으로 이동한다. */
  isAuthenticated: boolean;
  /** 비로그인일 때 선택지가 이동할 로그인 경로. */
  loginHref: string;
}

/** 찬성 · 아직 모르겠어요 · 반대를 항상 같은 크기로 같은 순서에 배치한다. */
const CHOICE_ORDER: VoteChoice[] = [VoteChoice.AGREE, VoteChoice.UNSURE, VoteChoice.DISAGREE];

const SELECTED_CLASS: Record<VoteChoice, string> = {
  [VoteChoice.AGREE]: styles.selectedAgree,
  [VoteChoice.UNSURE]: styles.selectedUnsure,
  [VoteChoice.DISAGREE]: styles.selectedDisagree,
};

export const VotePanelView = ({
  issueId,
  selectedChoice,
  onVote,
  isLoaded,
  hasSaveError = false,
  isAuthenticated,
  loginHref,
}: Props) => (
  <CardView as={CardElement.SECTION} id="vote" className={styles.card}>
    <h2 className={styles.title}>지금 당신의 생각은?</h2>
    <p className={styles.subtitle}>
      모든 정보를 확인한 뒤 편하게 골라주세요. 모르겠다는 것도 하나의 의견이에요.
    </p>

    <div className={styles.choices} aria-busy={!isLoaded}>
      {CHOICE_ORDER.map((choice) => {
        const label = getVoteChoiceLabel(choice);
        const isSelected = selectedChoice === choice;
        const className = joinClassNames(
          styles.choiceButton,
          isSelected && SELECTED_CLASS[choice],
        );

        // 비로그인 상태에서도 선택지는 같은 크기·같은 순서로 보이고, 누르면 로그인으로 이동한다.
        if (!isAuthenticated) {
          return (
            <Link
              key={choice}
              className={className}
              href={loginHref}
              aria-label={`로그인 후 ${label} 투표`}
            >
              <span>{label}</span>
            </Link>
          );
        }

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
            <span>{label}</span>
            {isSelected ? <CheckIcon size={18} /> : null}
          </button>
        );
      })}
    </div>

    {isAuthenticated ? null : <p className={styles.loginNotice}>투표하려면 로그인이 필요해요</p>}

    {hasSaveError ? <SaveErrorView /> : null}

    {isAuthenticated && selectedChoice ? (
      <ArrowLinkView className={styles.resultLink} href={`/issues/${issueId}/result`}>
        결과 보기
      </ArrowLinkView>
    ) : null}
  </CardView>
);
