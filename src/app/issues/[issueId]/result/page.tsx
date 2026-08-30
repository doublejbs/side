import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackHeaderView } from '@/components/common/BackHeaderView';
import { VoteResultContainer } from '@/components/result/VoteResultContainer';
import { getIssueRepository } from '@/data/getIssueRepository';
import { toIssueResultSummary } from '@/domain/IssueResultSummary';
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
  params: Promise<{ issueId: string }>;
}

export const generateStaticParams = async (): Promise<{ issueId: string }[]> => {
  const slugs = await getIssueRepository().listSlugs();

  return slugs.map((slug) => ({ issueId: slug }));
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { issueId } = await params;
  const issue = await getIssueRepository().getIssueBySlug(decodeSlugParam(issueId));

  if (!issue) {
    return { title: '투표 결과 · SIDE' };
  }

  return { title: `${issue.question} 투표 결과 · SIDE` };
};

const IssueResultPage = async ({ params }: Props) => {
  const { issueId } = await params;
  const issue = await getIssueRepository().getIssueBySlug(decodeSlugParam(issueId));

  if (!issue) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <BackHeaderView />

      <div className={styles.content}>
        {/* 투표 여부와 무관한 이슈 질문은 서버에서 렌더해 결과 화면의 골격을 먼저 보여준다. */}
        <h1 className={styles.question}>{issue.question}</h1>
        <VoteResultContainer
          issue={toIssueResultSummary(issue)}
          isServerEnabled={isServerVoteEnabled()}
          loginHref={buildLoginHref(`/issues/${issue.slug}#vote`)}
        />
      </div>
    </main>
  );
};

export default IssueResultPage;
