import type { Metadata } from 'next';

import { AppHeaderView } from '@/components/common/AppHeaderView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { MostDifferentIssueContainer } from '@/components/discover/MostDifferentIssueContainer';
import { MostDividedIssueView } from '@/components/discover/MostDividedIssueView';
import { pickMostDividedIssue } from '@/components/discover/pickDiscoverIssues';
import { SimilarGroupContainer } from '@/components/discover/SimilarGroupContainer';
import { getIssueRepository } from '@/data/getIssueRepository';
import { toIssueSummary } from '@/domain/IssueSummary';
import { toOpinionGroupSummary } from '@/domain/OpinionGroupSummary';

import styles from './page.module.css';

/**
 * 공개 화면은 정적으로 미리 만들고 60초마다 다시 만든다(ISR).
 * 검수에서 승인·반려한 결과는 `AdminActions` 의 `revalidatePath` 가 바로 반영한다.
 * 근거: `docs/PipelineSpec.md` 6장.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: '발견 · SIDE',
};

const DiscoverPage = async () => {
  const issues = await getIssueRepository().listPublishedIssues();
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
