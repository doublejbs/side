import type { Metadata } from 'next';

import { AppHeaderView } from '@/components/common/AppHeaderView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { MostDifferentIssueContainer } from '@/components/discover/MostDifferentIssueContainer';
import { MostDividedIssueView } from '@/components/discover/MostDividedIssueView';
import { pickMostDividedIssue } from '@/components/discover/pickDiscoverIssues';
import { SimilarGroupContainer } from '@/components/discover/SimilarGroupContainer';
import { getIssues } from '@/data/IssueRepository';
import { toIssueSummary } from '@/domain/IssueSummary';
import { toOpinionGroupSummary } from '@/domain/OpinionGroupSummary';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: '발견 · SIDE',
};

const DiscoverPage = () => {
  const issues = getIssues();
  const candidates = issues.map(toIssueSummary);
  const mostDividedIssue = pickMostDividedIssue(candidates);
  const firstOpinionGroup = issues[0]?.opinionGroups[0];
  const similarGroup = firstOpinionGroup ? toOpinionGroupSummary(firstOpinionGroup) : null;

  return (
    <main className={styles.page}>
      <AppHeaderView />
      <PageHeroView title="발견" description="새로운 관점을 찾는 공간이에요" />

      <div className={styles.content}>
        <MostDifferentIssueContainer candidates={candidates} />
        {mostDividedIssue ? <MostDividedIssueView issue={mostDividedIssue} /> : null}
        {similarGroup ? <SimilarGroupContainer group={similarGroup} /> : null}
      </div>
    </main>
  );
};

export default DiscoverPage;
