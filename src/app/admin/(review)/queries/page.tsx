import { createQueryAction, setQueryActiveAction } from '@/app/admin/AdminActions';
import { AdminBannerView } from '@/components/admin/AdminBannerView';
import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { DatabaseNoticeView } from '@/components/admin/DatabaseNoticeView';
import { SearchQueryCreateFormView } from '@/components/admin/SearchQueryCreateFormView';
import { SearchQueryListView } from '@/components/admin/SearchQueryListView';
import { toAdminBannerContent } from '@/components/admin/adminMessageBanner';
import { getAdminStore, isAdminDatabaseConnected } from '@/server/getAdminStore';

interface Props {
  searchParams: Promise<{ message?: string }>;
}

export const dynamic = 'force-dynamic';

const AdminQueriesPage = async ({ searchParams }: Props) => {
  const { message } = await searchParams;
  const banner = toAdminBannerContent(message);
  const queries = isAdminDatabaseConnected() ? await getAdminStore().listQueries() : [];

  return (
    <>
      {banner ? <AdminBannerView tone={banner.tone}>{banner.text}</AdminBannerView> : null}
      {isAdminDatabaseConnected() ? null : <DatabaseNoticeView />}
      <AdminSectionView
        title="수집 키워드"
        description="활성 키워드만 네이버 뉴스 검색에 사용합니다."
      >
        <SearchQueryCreateFormView createQueryAction={createQueryAction} />
        <SearchQueryListView queries={queries} setQueryActiveAction={setQueryActiveAction} />
      </AdminSectionView>
    </>
  );
};

export default AdminQueriesPage;
