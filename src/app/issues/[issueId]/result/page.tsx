import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackHeaderView } from '@/components/common/BackHeaderView';
import { VoteResultContainer } from '@/components/result/VoteResultContainer';
import { getIssueById, getIssues } from '@/data/IssueRepository';
import { toIssueResultSummary } from '@/domain/IssueResultSummary';

import styles from './page.module.css';

interface Props {
  params: Promise<{ issueId: string }>;
}

export const generateStaticParams = () => getIssues().map((issue) => ({ issueId: issue.id }));

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { issueId } = await params;
  const issue = getIssueById(issueId);

  if (!issue) {
    return { title: '투표 결과 · SIDE' };
  }

  return { title: `${issue.question} 투표 결과 · SIDE` };
};

const IssueResultPage = async ({ params }: Props) => {
  const { issueId } = await params;
  const issue = getIssueById(issueId);

  if (!issue) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <BackHeaderView />

      <div className={styles.content}>
        {/* 투표 여부와 무관한 이슈 질문은 서버에서 렌더해 결과 화면의 골격을 먼저 보여준다. */}
        <h1 className={styles.question}>{issue.question}</h1>
        <VoteResultContainer issue={toIssueResultSummary(issue)} />
      </div>
    </main>
  );
};

export default IssueResultPage;
