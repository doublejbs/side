import { SectionTitleView } from '@/components/common/SectionTitleView';
import type { KeyPoint } from '@/domain/Issue';

import styles from './KeyPointsView.module.css';

interface Props {
  keyPoints: KeyPoint[];
}

const toOrderLabel = (index: number): string => String(index + 1).padStart(2, '0');

export const KeyPointsView = ({ keyPoints }: Props) => (
  <section className={styles.section}>
    <SectionTitleView>왜 의견이 갈릴까요?</SectionTitleView>
    <ul className={styles.grid}>
      {keyPoints.map((keyPoint, index) => (
        <li key={keyPoint.id} className={styles.card}>
          <span className={styles.order}>{toOrderLabel(index)}</span>
          <span className={styles.title}>{keyPoint.title}</span>
          <span className={styles.question}>{keyPoint.question}</span>
        </li>
      ))}
    </ul>
  </section>
);
