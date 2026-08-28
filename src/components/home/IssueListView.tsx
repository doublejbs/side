import { IssueCardView } from '@/components/home/IssueCardView';
import type { Issue } from '@/domain/Issue';

import styles from './IssueListView.module.css';

interface Props {
  issues: Issue[];
}

export const IssueListView = ({ issues }: Props) => (
  <div className={styles.list}>
    {issues.map((issue, index) => (
      <IssueCardView key={issue.id} issue={issue} featured={index === 0} />
    ))}
  </div>
);
