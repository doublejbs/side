import { IssueReviewListView } from '@/components/admin/IssueReviewListView';
import { IssueStatusTabsView } from '@/components/admin/IssueStatusTabsView';
import { DatabaseNoticeView } from '@/components/admin/DatabaseNoticeView';
import { parseIssueStatus } from '@/server/adminEnumParsers';
import { getAdminStore, isAdminDatabaseConnected } from '@/server/getAdminStore';

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export const dynamic = 'force-dynamic';

const AdminIssueListPage = async ({ searchParams }: Props) => {
  const { status } = await searchParams;
  const activeStatus = parseIssueStatus(status);
  const issues = await getAdminStore().listIssues(activeStatus);

  return (
    <>
      <IssueStatusTabsView activeStatus={activeStatus} />
      {isAdminDatabaseConnected() ? (
        <IssueReviewListView issues={issues} />
      ) : (
        <DatabaseNoticeView />
      )}
    </>
  );
};

export default AdminIssueListPage;
