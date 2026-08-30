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
  /** 비로그인이라 내 투표를 쓸 수 없을 때의 로그인 경로. 없으면 게이트가 없다. */
  loginHref?: string;
}

const TITLE = '당신과 가장 다른 의견';

const EMPTY_DESCRIPTION =
  '아직 투표한 이슈가 없어요. 이슈에 의견을 남기면 나와 가장 다른 여론을 보여드릴게요.';

const LOGIN_DESCRIPTION = '로그인하면 내 투표를 기준으로 가장 다른 여론을 보여드릴게요.';

export const MostDifferentIssueView = ({ issue, myChoice, loginHref }: Props) => {
  if (loginHref) {
    return (
      <section className={styles.section}>
        <SectionTitleView>{TITLE}</SectionTitleView>
        <CardView className={styles.card}>
          <p className={styles.emptyDescription}>{LOGIN_DESCRIPTION}</p>
          <ArrowLinkView href={loginHref}>로그인하기</ArrowLinkView>
        </CardView>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <SectionTitleView>{TITLE}</SectionTitleView>
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
};
