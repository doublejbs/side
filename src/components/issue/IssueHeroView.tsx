import { StatTileView } from '@/components/common/StatTileView';

import styles from './IssueHeroView.module.css';

interface Props {
  question: string;
  participantCount: number;
  sourceArticleCount: number;
  keyPointCount: number;
}

export const IssueHeroView = ({
  question,
  participantCount,
  sourceArticleCount,
  keyPointCount,
}: Props) => (
  <section className={styles.hero}>
    <h1 className={styles.question}>{question}</h1>
    <div className={styles.stats}>
      <StatTileView value={participantCount.toLocaleString('ko-KR')} label="참여" />
      <StatTileView value={sourceArticleCount.toLocaleString('ko-KR')} label="원문 기사" />
      <StatTileView value={keyPointCount.toLocaleString('ko-KR')} label="핵심 쟁점" />
    </div>
  </section>
);
