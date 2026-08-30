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

/** 투표가 하나도 없을 때 분포 대신 보여줄 안내 문구. */
const EMPTY_DISTRIBUTION_MESSAGE = '아직 의견이 없어요 · 첫 의견을 남겨보세요';

const formatParticipantCount = (count: number): string => `${count.toLocaleString('ko-KR')}명`;

export const IssueCardView = ({ issue, featured = false }: Props) => {
  const participantLabel = formatParticipantCount(issue.participantCount);
  const isEmpty = issue.participantCount === 0;

  const tags = (
    <div className={styles.tags}>
      {issue.tags.map((tag) => (
        <ChipView key={tag}>{tag}</ChipView>
      ))}
    </div>
  );

  return (
    <Link href={`/issues/${issue.slug}`} className={styles.link}>
      <CardView as={CardElement.ARTICLE} className={`${styles.card} ${featured ? styles.featured : styles.compact}`}>
        {featured ? (
          tags
        ) : (
          <div className={styles.topRow}>
            {tags}
            {isEmpty ? null : <span className={styles.participantCompact}>{participantLabel}</span>}
          </div>
        )}

        <h2 className={featured ? styles.questionFeatured : styles.questionCompact}>
          {issue.question}
        </h2>

        {isEmpty ? (
          <p className={styles.emptyMessage}>{EMPTY_DISTRIBUTION_MESSAGE}</p>
        ) : (
          <div className={styles.distribution}>
            <DistributionBarView distribution={issue.distribution} height={featured ? 10 : 8} />
            <DistributionLegendView distribution={issue.distribution} colored={featured} />
          </div>
        )}

        {featured ? (
          <div className={styles.footer}>
            {isEmpty ? null : (
              <span className={styles.participantFeatured}>
                <b className={styles.participantValue}>{participantLabel}</b> 참여
              </span>
            )}
            <ArrowLinkView className={styles.cta}>3분 만에 이해하기</ArrowLinkView>
          </div>
        ) : null}
      </CardView>
    </Link>
  );
};
