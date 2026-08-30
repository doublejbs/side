import { notFound } from 'next/navigation';

import {
  deleteEvidenceAction,
  publishIssueAction,
  regenerateIssueAction,
  rejectIssueAction,
  restoreIssueAction,
  saveClaimAction,
  saveIssueAction,
  updateEvidenceTypeAction,
} from '@/app/admin/AdminActions';
import { AdminBannerView } from '@/components/admin/AdminBannerView';
import { DatabaseNoticeView } from '@/components/admin/DatabaseNoticeView';
import { IssueReviewFormView } from '@/components/admin/IssueReviewFormView';
import { toAdminBannerContent } from '@/components/admin/adminMessageBanner';
import { getAdminStore, isAdminDatabaseConnected } from '@/server/getAdminStore';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}

export const dynamic = 'force-dynamic';

const AdminIssueReviewPage = async ({ params, searchParams }: Props) => {
  if (!isAdminDatabaseConnected()) {
    return <DatabaseNoticeView />;
  }

  const { id } = await params;
  const { message } = await searchParams;
  const issue = await getAdminStore().getIssue(id);

  if (!issue) {
    notFound();
  }

  const banner = toAdminBannerContent(message);

  return (
    <>
      {banner ? <AdminBannerView tone={banner.tone}>{banner.text}</AdminBannerView> : null}
      <IssueReviewFormView
        issue={issue}
        saveIssueAction={saveIssueAction}
        saveClaimAction={saveClaimAction}
        publishIssueAction={publishIssueAction}
        rejectIssueAction={rejectIssueAction}
        restoreIssueAction={restoreIssueAction}
        regenerateIssueAction={regenerateIssueAction}
        updateEvidenceTypeAction={updateEvidenceTypeAction}
        deleteEvidenceAction={deleteEvidenceAction}
      />
    </>
  );
};

export default AdminIssueReviewPage;
