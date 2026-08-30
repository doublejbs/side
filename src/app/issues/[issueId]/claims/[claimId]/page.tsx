import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ClaimFeedbackContainer } from '@/components/claim/ClaimFeedbackContainer';
import { ClaimHeaderView } from '@/components/claim/ClaimHeaderView';
import { EvidenceListView } from '@/components/claim/EvidenceListView';
import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { BackHeaderView } from '@/components/common/BackHeaderView';
import { getIssueRepository } from '@/data/getIssueRepository';
import { getClaimSideAnchor } from '@/domain/claimSidePresenter';
import { buildLoginHref } from '@/lib/auth/buildLoginHref';
import { decodeSlugParam } from '@/server/decodeRouteParam';
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
  params: Promise<{ issueId: string; claimId: string }>;
}

/** DB 모드에서 연결에 실패하면 빈 배열이 되고, 경로는 요청 시 렌더된다(dynamicParams 기본값 true). */
export const generateStaticParams = async (): Promise<{ issueId: string; claimId: string }[]> => {
  const params = await getIssueRepository().listClaimParams();

  return params.map(({ slug, claimId }) => ({ issueId: slug, claimId }));
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { issueId, claimId } = await params;
  const claim = await getIssueRepository().getClaimById(decodeSlugParam(issueId), claimId);

  if (!claim) {
    return { title: 'SIDE' };
  }

  return { title: `${claim.title} · SIDE`, description: claim.description };
};

const ClaimEvidencePage = async ({ params }: Props) => {
  const { issueId, claimId } = await params;
  const slug = decodeSlugParam(issueId);
  const repository = getIssueRepository();
  const issue = await repository.getIssueBySlug(slug);
  const claim = await repository.getClaimById(slug, claimId);

  if (!issue || !claim) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <BackHeaderView title={issue.question} />

      <div className={styles.content}>
        <ClaimHeaderView claim={claim} />

        <EvidenceListView evidences={claim.evidences} />

        <ClaimFeedbackContainer
          claimId={claim.id}
          isServerEnabled={isServerVoteEnabled()}
          loginHref={buildLoginHref(`/issues/${issue.slug}/claims/${claim.id}#feedback`)}
        />

        <ArrowLinkView
          className={styles.backLink}
          href={`/issues/${issue.slug}#${getClaimSideAnchor(claim.side)}`}
        >
          이슈로 돌아가기
        </ArrowLinkView>
      </div>
    </main>
  );
};

export default ClaimEvidencePage;
