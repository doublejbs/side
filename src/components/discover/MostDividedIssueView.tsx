import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { DistributionBarView } from '@/components/common/DistributionBarView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import { IssueQuestionLinkView } from '@/components/discover/IssueQuestionLinkView';
import { getAgreeDisagreeGap } from '@/components/discover/pickDiscoverIssues';
import type { IssueSummary } from '@/domain/IssueSummary';

import styles from './MostDividedIssueView.module.css';

interface Props {
  issue: IssueSummary;
}

export const MostDividedIssueView = ({ issue }: Props) => (
  <section className={styles.section}>
    <SectionTitleView>의외로 의견이 갈리는 이슈</SectionTitleView>
    <CardView as={CardElement.ARTICLE} className={styles.card}>
      <IssueQuestionLinkView issueId={issue.id} question={issue.question} />
      <DistributionBarView distribution={issue.distribution} />
      <p className={styles.gap}>
        {`찬성 ${issue.distribution.agree}% · 반대 ${issue.distribution.disagree}% — 단 ${getAgreeDisagreeGap(issue)}%p 차이`}
      </p>
    </CardView>
  </section>
);
