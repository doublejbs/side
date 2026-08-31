import { AdminBannerTone } from '@/components/admin/AdminBannerTone';
import { AdminBannerView } from '@/components/admin/AdminBannerView';
import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { AdminTextAreaFieldView } from '@/components/admin/AdminTextAreaFieldView';
import { ClaimEditorListView } from '@/components/admin/ClaimEditorListView';
import { IssueActionBarView } from '@/components/admin/IssueActionBarView';
import { IssueAxesEditorContainer } from '@/components/admin/IssueAxesEditorContainer';
import { IssueBasicFieldsView } from '@/components/admin/IssueBasicFieldsView';
import { IssueClassificationCardView } from '@/components/admin/IssueClassificationCardView';
import { IssueMergeFormView } from '@/components/admin/IssueMergeFormView';
import { MediaPerspectiveEditorView } from '@/components/admin/MediaPerspectiveEditorView';
import { OpinionGroupEditorView } from '@/components/admin/OpinionGroupEditorView';
import { ReviewArticleListView } from '@/components/admin/ReviewArticleListView';
import { ISSUE_STATUS_LABEL } from '@/components/admin/adminLabels';
import { formatAdminDate } from '@/components/admin/formatAdminDate';
import { AdminFormField } from '@/server/AdminFormField';
import type { AdminIssueDetail, AdminMergeTarget } from '@/server/AdminStore';

import styles from './IssueReviewFormView.module.css';

interface Props {
  issue: AdminIssueDetail;
  /** 병합 대상 후보(최근 30일 DRAFT·REVIEW·PUBLISHED). */
  mergeTargets: AdminMergeTarget[];
  saveIssueAction: (formData: FormData) => Promise<void>;
  saveClaimAction: (formData: FormData) => Promise<void>;
  publishIssueAction: (formData: FormData) => Promise<void>;
  rejectIssueAction: (formData: FormData) => Promise<void>;
  restoreIssueAction: (formData: FormData) => Promise<void>;
  regenerateIssueAction: (formData: FormData) => Promise<void>;
  mergeIssueAction: (formData: FormData) => Promise<void>;
  updateEvidenceTypeAction: (formData: FormData) => Promise<void>;
  deleteEvidenceAction: (formData: FormData) => Promise<void>;
}

/**
 * 검수 폼 전체. 폼은 하나만 두고, 카드마다 `formAction` 으로 다른 서버 액션에 제출한다.
 * (HTML 은 폼 중첩을 허용하지 않는다.)
 */
export const IssueReviewFormView = ({
  issue,
  mergeTargets,
  saveIssueAction,
  saveClaimAction,
  publishIssueAction,
  rejectIssueAction,
  restoreIssueAction,
  regenerateIssueAction,
  mergeIssueAction,
  updateEvidenceTypeAction,
  deleteEvidenceAction,
}: Props) => (
  <form action={saveIssueAction} className={styles.form}>
    <input type="hidden" name={AdminFormField.ISSUE_ID} value={issue.id} />

    <header className={styles.header}>
      <h1 className={styles.question}>{issue.question}</h1>
      <p className={styles.meta}>
        {ISSUE_STATUS_LABEL[issue.status]} · 생성 {formatAdminDate(issue.createdAt)}
        {issue.slug ? ` · /issues/${issue.slug}` : ''}
      </p>
    </header>

    {issue.reviewNote ? (
      <AdminBannerView tone={AdminBannerTone.WARNING} title="검수 메모">
        {issue.reviewNote}
      </AdminBannerView>
    ) : null}

    <IssueClassificationCardView
      classification={issue.classification}
      debateScore={issue.debateScore}
      topic={issue.topic}
      classifiedAt={issue.classifiedAt}
      verifiedAt={issue.verifiedAt}
    />

    <IssueMergeFormView
      status={issue.status}
      duplicateOfIssueId={issue.classification?.duplicateOfIssueId ?? null}
      targets={mergeTargets}
      mergeIssueAction={mergeIssueAction}
    />

    <IssueBasicFieldsView
      question={issue.question}
      tags={issue.tags}
      summary={issue.summary}
      keyPoints={issue.keyPoints}
    />

    <IssueAxesEditorContainer axes={issue.axes} />

    <ClaimEditorListView
      claims={issue.claims}
      saveClaimAction={saveClaimAction}
      updateEvidenceTypeAction={updateEvidenceTypeAction}
      deleteEvidenceAction={deleteEvidenceAction}
    />

    <MediaPerspectiveEditorView
      mediaPerspectives={issue.mediaPerspectives}
      isExtracted={issue.claims.length > 0}
    />

    <AdminSectionView title="공통 내용" description="성향과 관계없이 모든 매체가 함께 다룬 사실.">
      <AdminTextAreaFieldView
        label="공통 내용"
        name={AdminFormField.COMMON_COVERAGE}
        defaultValue={issue.commonCoverage.join('\n')}
        rows={4}
        description="한 줄에 하나씩."
      />
    </AdminSectionView>

    <OpinionGroupEditorView issueId={issue.id} opinionGroups={issue.opinionGroups} />

    <ReviewArticleListView articles={issue.articles} />

    <IssueActionBarView
      status={issue.status}
      publishIssueAction={publishIssueAction}
      rejectIssueAction={rejectIssueAction}
      restoreIssueAction={restoreIssueAction}
      regenerateIssueAction={regenerateIssueAction}
    />
  </form>
);
