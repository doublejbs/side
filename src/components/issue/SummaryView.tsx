import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { ClockIcon } from '@/components/common/icons/ClockIcon';

import styles from './SummaryView.module.css';

interface Props {
  sentences: string[];
  sourceArticleCount: number;
}

export const SummaryView = ({ sentences, sourceArticleCount }: Props) => (
  <CardView as={CardElement.SECTION} className={styles.card}>
    <div className={styles.header}>
      <ClockIcon size={16} />
      <span className={styles.headerLabel}>30초 요약</span>
    </div>
    <div className={styles.sentences}>
      {sentences.map((sentence, index) => (
        <p key={`${index}-${sentence}`} className={styles.sentence}>
          {sentence}
        </p>
      ))}
    </div>
    {/* MVP에서는 원문 기사 목록 화면이 없어 링크가 아닌 안내 문구로만 출처 규모를 알린다. */}
    <span className={styles.sourceNote}>
      원문 기사 {sourceArticleCount}개를 바탕으로 정리했어요
    </span>
  </CardView>
);
