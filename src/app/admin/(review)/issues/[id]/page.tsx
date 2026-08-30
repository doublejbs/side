import { notFound } from 'next/navigation';

import {
  deleteEvidenceAction,
  mergeIssueAction,
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
  const store = getAdminStore();
  const issue = await store.getIssue(id);

  if (!issue) {
    notFound();
  }

  const mergeTargets = await store.listMergeTargets(id);

  const banner = toAdminBannerContent(message);

  return (
    <>
      {banner ? <AdminBannerView tone={banner.tone}>{banner.text}</AdminBannerView> : null}
      <IssueReviewFormView
        issue={issue}
        mergeTargets={mergeTargets}
        saveIssueAction={saveIssueAction}
        saveClaimAction={saveClaimAction}
        publishIssueAction={publishIssueAction}
        rejectIssueAction={rejectIssueAction}
        restoreIssueAction={restoreIssueAction}
        regenerateIssueAction={regenerateIssueAction}
        mergeIssueAction={mergeIssueAction}
        updateEvidenceTypeAction={updateEvidenceTypeAction}
        deleteEvidenceAction={deleteEvidenceAction}
      />
    </>
  );
};

export default AdminIssueReviewPage;
