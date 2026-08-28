import Link from 'next/link';

import { ISSUE_STATUS_LABEL } from '@/components/admin/adminLabels';
import { joinClassNames } from '@/components/common/joinClassNames';
import { IssueStatus } from '@/domain/IssueStatus';

import styles from './IssueStatusTabsView.module.css';

const TAB_ORDER: IssueStatus[] = [
  IssueStatus.REVIEW,
  IssueStatus.DRAFT,
  IssueStatus.PUBLISHED,
  IssueStatus.REJECTED,
];

interface Props {
  activeStatus: IssueStatus;
}

export const IssueStatusTabsView = ({ activeStatus }: Props) => (
  <nav className={styles.tabs} aria-label="이슈 상태">
    {TAB_ORDER.map((status) => (
      <Link
        key={status}
        href={`/admin?status=${status}`}
        className={joinClassNames(styles.tab, status === activeStatus && styles.active)}
        aria-current={status === activeStatus ? 'page' : undefined}
      >
        {ISSUE_STATUS_LABEL[status]}
      </Link>
    ))}
  </nav>
);
