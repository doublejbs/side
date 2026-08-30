import { ClaimFeedbackOptionView } from '@/components/claim/ClaimFeedbackOptionView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { SaveErrorView } from '@/components/common/SaveErrorView';
import { ClaimFeedback } from '@/domain/ClaimFeedback';

import styles from './ClaimFeedbackView.module.css';

interface Props {
  selected: ClaimFeedback | null;
  onToggle: (feedback: ClaimFeedback) => void;
  isLoaded: boolean;
  /** 서버 저장에 실패했는지. 실패해도 내 선택은 로컬에 남는다. */
  hasSaveError?: boolean;
  /** 로그인 상태. false 면 선택지가 피드백 대신 로그인으로 이동한다. */
  isAuthenticated: boolean;
  /** 비로그인일 때 선택지가 이동할 로그인 경로. */
  loginHref: string;
}

interface FeedbackOption {
  feedback: ClaimFeedback;
  label: string;
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { feedback: ClaimFeedback.PERSUADED, label: '설득됐어요' },
  { feedback: ClaimFeedback.NOT_PERSUADED, label: '설득되지 않았어요' },
  { feedback: ClaimFeedback.LACKS_EVIDENCE, label: '근거가 부족해요' },
];

export const ClaimFeedbackView = ({
  selected,
  onToggle,
  isLoaded,
  hasSaveError = false,
  isAuthenticated,
  loginHref,
}: Props) => (
  <CardView as={CardElement.SECTION} id="feedback" className={styles.card}>
    <h2 className={styles.title}>이 주장, 어땠나요?</h2>
    <p className={styles.description}>피드백은 콘텐츠 품질을 높이는 데 쓰여요.</p>

    <div className={styles.options} aria-busy={!isLoaded}>
      {FEEDBACK_OPTIONS.map((option) => (
        <ClaimFeedbackOptionView
          key={option.feedback}
          feedback={option.feedback}
          label={option.label}
          isSelected={selected === option.feedback}
          isLoaded={isLoaded}
          onToggle={onToggle}
          isAuthenticated={isAuthenticated}
          loginHref={loginHref}
        />
      ))}
    </div>

    {isAuthenticated ? null : (
      <p className={styles.loginNotice}>피드백을 남기려면 로그인이 필요해요</p>
    )}

    {hasSaveError ? <SaveErrorView /> : null}
  </CardView>
);
