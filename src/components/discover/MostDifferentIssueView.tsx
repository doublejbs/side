import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { ChipView } from '@/components/common/ChipView';
import { DistributionBarView } from '@/components/common/DistributionBarView';
import { DistributionLegendView } from '@/components/common/DistributionLegendView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import { getVoteChoiceChipTone } from '@/components/common/voteChoiceChipTone';
import { IssueQuestionLinkView } from '@/components/discover/IssueQuestionLinkView';
import type { IssueSummary } from '@/domain/IssueSummary';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceLabel } from '@/domain/voteChoiceLabel';

import styles from './MostDifferentIssueView.module.css';

interface Props {
  issue: IssueSummary | null;
  myChoice: VoteChoice | null;
}

const EMPTY_DESCRIPTION =
  '아직 투표한 이슈가 없어요. 이슈에 의견을 남기면 나와 가장 다른 여론을 보여드릴게요.';

export const MostDifferentIssueView = ({ issue, myChoice }: Props) => (
  <section className={styles.section}>
    <SectionTitleView>당신과 가장 다른 의견</SectionTitleView>
    {issue && myChoice ? (
      <CardView as={CardElement.ARTICLE} className={styles.card}>
        <IssueQuestionLinkView issueId={issue.slug} question={issue.question} />
        <div className={styles.compareRow}>
          <ChipView tone={getVoteChoiceChipTone(myChoice)}>
            {`내 선택 · ${getVoteChoiceLabel(myChoice)}`}
          </ChipView>
          <span className={styles.overallLabel}>전체 여론</span>
        </div>
        <DistributionLegendView distribution={issue.distribution} colored />
        <DistributionBarView distribution={issue.distribution} />
      </CardView>
    ) : (
      <CardView className={styles.card}>
        <p className={styles.emptyDescription}>{EMPTY_DESCRIPTION}</p>
        <ArrowLinkView href="/">이슈 보러 가기</ArrowLinkView>
      </CardView>
    )}
  </section>
);
