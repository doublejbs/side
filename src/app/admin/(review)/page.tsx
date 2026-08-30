import { AdminBannerView } from '@/components/admin/AdminBannerView';
import { IssueReviewListView } from '@/components/admin/IssueReviewListView';
import { IssueStatusTabsView } from '@/components/admin/IssueStatusTabsView';
import { DatabaseNoticeView } from '@/components/admin/DatabaseNoticeView';
import { toAdminBannerContent } from '@/components/admin/adminMessageBanner';
import { parseIssueStatus } from '@/server/adminEnumParsers';
import { getAdminStore, isAdminDatabaseConnected } from '@/server/getAdminStore';

interface Props {
  searchParams: Promise<{ status?: string; message?: string }>;
}

export const dynamic = 'force-dynamic';

const AdminIssueListPage = async ({ searchParams }: Props) => {
  const { status, message } = await searchParams;
  const activeStatus = parseIssueStatus(status);
  const issues = await getAdminStore().listIssues(activeStatus);
  // 복원처럼 상세에서 목록으로 돌려보내는 액션의 결과를 여기서 알려 준다.
  const banner = toAdminBannerContent(message);

  return (
    <>
      {banner ? <AdminBannerView tone={banner.tone}>{banner.text}</AdminBannerView> : null}
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
