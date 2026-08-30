import Link from 'next/link';

import { formatAdminDate } from '@/components/admin/formatAdminDate';
import type { AdminIssueListItem } from '@/server/AdminStore';

import styles from './IssueReviewListView.module.css';

interface Props {
  issues: AdminIssueListItem[];
}

/** 아직 분류되지 않아 값이 없는 칸. */
const EMPTY_VALUE = '–';

export const IssueReviewListView = ({ issues }: Props) => {
  if (issues.length === 0) {
    return <p className={styles.empty}>이 상태의 이슈가 없습니다.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">질문</th>
          <th scope="col" className={styles.numeric}>
            기사
          </th>
          <th scope="col" className={styles.numeric}>
            주장
          </th>
          <th scope="col" className={styles.numeric}>
            점수
          </th>
          <th scope="col" className={styles.topic}>
            주제
          </th>
          <th scope="col">생성일</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id}>
            <td>
              <Link href={`/admin/issues/${issue.id}`} className={styles.questionLink}>
                {issue.question}
              </Link>
              {issue.hasWarning ? <span className={styles.warning}>검수 경고</span> : null}
              {issue.hasDuplicateWarning ? (
                <span className={styles.duplicate}>중복 가능</span>
              ) : null}
            </td>
            <td className={styles.numeric}>{issue.articleCount}</td>
            <td className={styles.numeric}>{issue.claimCount}</td>
            <td className={styles.numeric}>{issue.debateScore ?? EMPTY_VALUE}</td>
            <td className={styles.topic}>{issue.topic ?? EMPTY_VALUE}</td>
            <td className={styles.date}>{formatAdminDate(issue.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
