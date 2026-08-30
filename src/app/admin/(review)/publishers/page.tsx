import { deletePublisherAction, savePublisherAction } from '@/app/admin/AdminActions';
import { AdminBannerTone } from '@/components/admin/AdminBannerTone';
import { AdminBannerView } from '@/components/admin/AdminBannerView';
import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { DatabaseNoticeView } from '@/components/admin/DatabaseNoticeView';
import { PublisherCreateFormView } from '@/components/admin/PublisherCreateFormView';
import { PublisherTableView } from '@/components/admin/PublisherTableView';
import { toAdminBannerContent } from '@/components/admin/adminMessageBanner';
import { getAdminStore, isAdminDatabaseConnected } from '@/server/getAdminStore';

interface Props {
  searchParams: Promise<{ message?: string }>;
}

export const dynamic = 'force-dynamic';

const AdminPublishersPage = async ({ searchParams }: Props) => {
  const { message } = await searchParams;
  const banner = toAdminBannerContent(message);
  const publishers = isAdminDatabaseConnected() ? await getAdminStore().listPublishers() : [];

  return (
    <>
      {banner ? <AdminBannerView tone={banner.tone}>{banner.text}</AdminBannerView> : null}
      {isAdminDatabaseConnected() ? null : <DatabaseNoticeView />}
      <AdminBannerView tone={AdminBannerTone.INFO}>
        성향은 언론 관점 비교의 그룹핑 기준일 뿐 매체 평가가 아닙니다. 미지정 매체는 언론 관점
        집계에서 제외됩니다.
      </AdminBannerView>
      <AdminSectionView title="매체">
        <PublisherCreateFormView savePublisherAction={savePublisherAction} />
        <PublisherTableView
          publishers={publishers}
          savePublisherAction={savePublisherAction}
          deletePublisherAction={deletePublisherAction}
        />
      </AdminSectionView>
    </>
  );
};

export default AdminPublishersPage;
