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
import { getIssueRepository } from '@/data/getIssueRepository';
import { ClaimSide } from '@/domain/ClaimSide';
import type { Claim } from '@/domain/Issue';
import { isServerVoteEnabled } from '@/server/isServerVoteEnabled';

import styles from './page.module.css';

/**
 * 공개 화면은 정적으로 미리 만들고 60초마다 다시 만든다(ISR).
 * 검수에서 승인·반려한 결과는 `AdminActions` 의 `revalidatePath` 가 바로 반영한다.
 * 근거: `docs/PipelineSpec.md` 6장.
 */
export const revalidate = 60;

/** 라우트 파라미터 이름은 `issueId` 지만 값은 이슈의 `slug`(URL 식별자)다. */
interface Props {
  params: Promise<{ issueId: string }>;
}

const filterBySide = (claims: Claim[], side: ClaimSide): Claim[] =>
  claims.filter((claim) => claim.side === side);

/** DB 모드에서 연결에 실패하면 빈 배열이 되고, 경로는 요청 시 렌더된다(dynamicParams 기본값 true). */
export const generateStaticParams = async (): Promise<{ issueId: string }[]> => {
  const slugs = await getIssueRepository().listSlugs();

  return slugs.map((slug) => ({ issueId: slug }));
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { issueId } = await params;
  const issue = await getIssueRepository().getIssueBySlug(issueId);

  if (!issue) {
    return { title: '이슈를 찾을 수 없어요 · SIDE' };
  }

  return { title: `${issue.question} · SIDE` };
};

const IssueDetailPage = async ({ params }: Props) => {
  const { issueId } = await params;
  const issue = await getIssueRepository().getIssueBySlug(issueId);

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
          issueId={issue.slug}
          side={ClaimSide.AGREE}
          claims={filterBySide(issue.claims, ClaimSide.AGREE)}
        />
        <ClaimSectionView
          issueId={issue.slug}
          side={ClaimSide.DISAGREE}
          claims={filterBySide(issue.claims, ClaimSide.DISAGREE)}
        />
        <MediaPerspectiveView
          perspectives={issue.mediaPerspectives}
          commonCoverage={issue.commonCoverage}
          mediaOutletCount={issue.mediaOutletCount}
          coveragePeriodLabel={issue.coveragePeriodLabel}
        />
        <VotePanelContainer issueId={issue.slug} isServerEnabled={isServerVoteEnabled()} />
      </div>
    </main>
  );
};

export default IssueDetailPage;
