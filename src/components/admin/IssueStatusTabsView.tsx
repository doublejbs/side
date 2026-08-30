import Link from 'next/link';

import { ISSUE_STATUS_LABEL } from '@/components/admin/adminLabels';
import { joinClassNames } from '@/components/common/joinClassNames';
import { IssueStatus } from '@/domain/IssueStatus';

import styles from './IssueStatusTabsView.module.css';

/** 검수 흐름을 따라 놓는다. 자동 제외는 초안 다음(오탐을 바로 확인)에 둔다. */
const TAB_ORDER: IssueStatus[] = [
  IssueStatus.REVIEW,
  IssueStatus.DRAFT,
  IssueStatus.AUTO_REJECTED,
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
