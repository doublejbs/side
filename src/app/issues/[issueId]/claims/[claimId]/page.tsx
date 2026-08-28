import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ClaimFeedbackContainer } from '@/components/claim/ClaimFeedbackContainer';
import { ClaimHeaderView } from '@/components/claim/ClaimHeaderView';
import { EvidenceListView } from '@/components/claim/EvidenceListView';
import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { BackHeaderView } from '@/components/common/BackHeaderView';
import { getClaimById, getIssueById, getIssues } from '@/data/IssueRepository';
import { getClaimSideAnchor } from '@/domain/claimSidePresenter';

import styles from './page.module.css';

interface Props {
  params: Promise<{ issueId: string; claimId: string }>;
}

export const generateStaticParams = (): { issueId: string; claimId: string }[] =>
  getIssues().flatMap((issue) =>
    issue.claims.map((claim) => ({ issueId: issue.id, claimId: claim.id })),
  );

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { issueId, claimId } = await params;
  const claim = getClaimById(issueId, claimId);

  if (!claim) {
    return { title: 'SIDE' };
  }

  return { title: `${claim.title} · SIDE`, description: claim.description };
};

const ClaimEvidencePage = async ({ params }: Props) => {
  const { issueId, claimId } = await params;
  const issue = getIssueById(issueId);
  const claim = getClaimById(issueId, claimId);

  if (!issue || !claim) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <BackHeaderView title={issue.question} />

      <div className={styles.content}>
        <ClaimHeaderView claim={claim} />

        <EvidenceListView evidences={claim.evidences} />

        <ClaimFeedbackContainer claimId={claim.id} />

        <ArrowLinkView
          className={styles.backLink}
          href={`/issues/${issue.id}#${getClaimSideAnchor(claim.side)}`}
        >
          이슈로 돌아가기
        </ArrowLinkView>
      </div>
    </main>
  );
};

export default ClaimEvidencePage;
