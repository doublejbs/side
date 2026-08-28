import Link from 'next/link';

import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { ChipView } from '@/components/common/ChipView';
import { DistributionBarView } from '@/components/common/DistributionBarView';
import { DistributionLegendView } from '@/components/common/DistributionLegendView';
import type { Issue } from '@/domain/Issue';

import styles from './IssueCardView.module.css';

interface Props {
  issue: Issue;
  featured?: boolean;
}

const formatParticipantCount = (count: number): string => `${count.toLocaleString('ko-KR')}명`;

export const IssueCardView = ({ issue, featured = false }: Props) => {
  const participantLabel = formatParticipantCount(issue.participantCount);

  const tags = (
    <div className={styles.tags}>
      {issue.tags.map((tag) => (
        <ChipView key={tag}>{tag}</ChipView>
      ))}
    </div>
  );

  return (
    <Link href={`/issues/${issue.id}`} className={styles.link}>
      <CardView as={CardElement.ARTICLE} className={`${styles.card} ${featured ? styles.featured : styles.compact}`}>
        {featured ? (
          tags
        ) : (
          <div className={styles.topRow}>
            {tags}
            <span className={styles.participantCompact}>{participantLabel}</span>
          </div>
        )}

        <h2 className={featured ? styles.questionFeatured : styles.questionCompact}>
          {issue.question}
        </h2>

        <div className={styles.distribution}>
          <DistributionBarView distribution={issue.distribution} height={featured ? 10 : 8} />
          <DistributionLegendView distribution={issue.distribution} colored={featured} />
        </div>

        {featured ? (
          <div className={styles.footer}>
            <span className={styles.participantFeatured}>
              <b className={styles.participantValue}>{participantLabel}</b> 참여
            </span>
            <ArrowLinkView className={styles.cta}>3분 만에 이해하기</ArrowLinkView>
          </div>
        ) : null}
      </CardView>
    </Link>
  );
};
