import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import type { OpinionGroupSummary } from '@/domain/OpinionGroupSummary';

import styles from './SimilarGroupView.module.css';

interface Props {
  group: OpinionGroupSummary;
  votedCount: number;
}

const EMPTY_DESCRIPTION = '이슈에 참여하면 비슷한 그룹을 찾아드려요';

export const SimilarGroupView = ({ group, votedCount }: Props) => (
  <section className={styles.section}>
    <SectionTitleView description={votedCount > 0 ? `참여한 ${votedCount}개 이슈 기반` : undefined}>
      내 생각과 비슷한 그룹
    </SectionTitleView>
    {votedCount > 0 ? (
      <CardView as={CardElement.ARTICLE} className={styles.card} highlighted>
        <div className={styles.groupRow}>
          <span className={styles.share}>{group.share}%</span>
          <span className={styles.label}>{group.label}</span>
        </div>
        <p className={styles.description}>{group.description}</p>
      </CardView>
    ) : (
      <CardView className={styles.card}>
        <p className={styles.description}>{EMPTY_DESCRIPTION}</p>
        <ArrowLinkView href="/">이슈 보러 가기</ArrowLinkView>
      </CardView>
    )}
  </section>
);
