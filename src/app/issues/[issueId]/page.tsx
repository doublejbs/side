import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackHeaderView } from '@/components/common/BackHeaderView';
import { ChipView } from '@/components/common/ChipView';
import { ClaimSectionView } from '@/components/issue/ClaimSectionView';
import { IssueHeroView } from '@/components/issue/IssueHeroView';
import { KeyPointsView } from '@/components/issue/KeyPointsView';
import { MediaPerspectiveView } from '@/components/issue/MediaPerspectiveView';
import { SummaryView } from '@/components/issue/SummaryView';
import { VotePanelContainer } from '@/components/issue/VotePanelContainer';
import { getIssueById, getIssues } from '@/data/IssueRepository';
import { ClaimSide } from '@/domain/ClaimSide';
import type { Claim } from '@/domain/Issue';

import styles from './page.module.css';

interface Props {
  params: Promise<{ issueId: string }>;
}

const filterBySide = (claims: Claim[], side: ClaimSide): Claim[] =>
  claims.filter((claim) => claim.side === side);

export const generateStaticParams = () => getIssues().map((issue) => ({ issueId: issue.id }));

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { issueId } = await params;
  const issue = getIssueById(issueId);

  if (!issue) {
    return { title: '이슈를 찾을 수 없어요 · SIDE' };
  }

  return { title: `${issue.question} · SIDE` };
};

const IssueDetailPage = async ({ params }: Props) => {
  const { issueId } = await params;
  const issue = getIssueById(issueId);

  if (!issue) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <BackHeaderView>
        {issue.tags.map((tag) => (
          <ChipView key={tag}>{tag}</ChipView>
        ))}
      </BackHeaderView>

      <div className={styles.sections}>
        <IssueHeroView
          question={issue.question}
          participantCount={issue.participantCount}
          sourceArticleCount={issue.sourceArticleCount}
          keyPointCount={issue.keyPoints.length}
        />
        <SummaryView sentences={issue.summary} sourceArticleCount={issue.sourceArticleCount} />
        <KeyPointsView keyPoints={issue.keyPoints} />
        <ClaimSectionView
          issueId={issue.id}
          side={ClaimSide.AGREE}
          claims={filterBySide(issue.claims, ClaimSide.AGREE)}
        />
        <ClaimSectionView
          issueId={issue.id}
          side={ClaimSide.DISAGREE}
          claims={filterBySide(issue.claims, ClaimSide.DISAGREE)}
        />
        <MediaPerspectiveView
          perspectives={issue.mediaPerspectives}
          commonCoverage={issue.commonCoverage}
          mediaOutletCount={issue.mediaOutletCount}
          coveragePeriodLabel={issue.coveragePeriodLabel}
        />
        <VotePanelContainer issueId={issue.id} />
      </div>
    </main>
  );
};

export default IssueDetailPage;
