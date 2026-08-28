import { EvidenceTypeBadgeView } from '@/components/claim/EvidenceTypeBadgeView';
import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardView } from '@/components/common/CardView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import type { Evidence } from '@/domain/Issue';

import styles from './EvidenceListView.module.css';

interface Props {
  evidences: Evidence[];
}

export const EvidenceListView = ({ evidences }: Props) => (
  <section className={styles.section}>
    <SectionTitleView>근거 {evidences.length}개</SectionTitleView>

    <ul className={styles.list}>
      {evidences.map((evidence) => (
        <li key={evidence.id}>
          <CardView className={styles.card}>
            <div className={styles.topRow}>
              <EvidenceTypeBadgeView type={evidence.type} />
              <span className={styles.source}>
                {evidence.source} · {evidence.date}
              </span>
            </div>

            <p className={styles.summary}>{evidence.summary}</p>

            <ArrowLinkView
              className={styles.link}
              href={evidence.url}
              external
              ariaLabel={`${evidence.source} 원문 보기`}
            >
              원문 보기
            </ArrowLinkView>
          </CardView>
        </li>
      ))}
    </ul>
  </section>
);
