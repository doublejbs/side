import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { AdminTextAreaFieldView } from '@/components/admin/AdminTextAreaFieldView';
import { IssueStatus } from '@/domain/IssueStatus';
import { REGENERATABLE_STATUSES } from '@/domain/regeneratableStatuses';
import { AdminFormField } from '@/server/AdminFormField';

import styles from './IssueActionBarView.module.css';

interface Props {
  status: IssueStatus;
  publishIssueAction: (formData: FormData) => Promise<void>;
  rejectIssueAction: (formData: FormData) => Promise<void>;
  restoreIssueAction: (formData: FormData) => Promise<void>;
  regenerateIssueAction: (formData: FormData) => Promise<void>;
}

/** 다시 생성이 막힌 이유. 버튼 옆 문구와 `title` 툴팁이 같은 문장을 쓴다. */
const REGENERATE_BLOCKED_REASON =
  '발행·반려·자동 제외된 이슈는 다시 생성할 수 없습니다. 검수 대상으로 복원하거나 검수 대기로 되돌린 뒤 시도해 주세요.';

/** 복원을 허용하는 상태. 유스케이스(`restoreIssue`)와 같은 목록으로 판단한다. */
const RESTORABLE_STATUSES: IssueStatus[] = [IssueStatus.AUTO_REJECTED, IssueStatus.REJECTED];

export const IssueActionBarView = ({
  status,
  publishIssueAction,
  rejectIssueAction,
  restoreIssueAction,
  regenerateIssueAction,
}: Props) => {
  const isRegenerateBlocked = !REGENERATABLE_STATUSES.includes(status);
  const isRestorable = RESTORABLE_STATUSES.includes(status);

  return (
    <div className={styles.bar}>
      <AdminTextAreaFieldView
        label="반려 메모"
        name={AdminFormField.REVIEW_NOTE}
        rows={2}
        description="반려할 때만 사용합니다. 무엇을 고쳐야 하는지 적어 주세요."
      />
      <div className={styles.buttons}>
        <AdminButtonView tone={AdminButtonTone.PRIMARY}>저장</AdminButtonView>
        <AdminButtonView formAction={publishIssueAction}>승인</AdminButtonView>
        <AdminButtonView formAction={rejectIssueAction} tone={AdminButtonTone.DANGER}>
          반려
        </AdminButtonView>
        {isRestorable ? (
          <AdminButtonView formAction={restoreIssueAction}>검수 대상으로 복원</AdminButtonView>
        ) : null}
        <div className={styles.regenerate}>
          <AdminButtonView
            formAction={regenerateIssueAction}
            disabled={isRegenerateBlocked}
            title={isRegenerateBlocked ? REGENERATE_BLOCKED_REASON : undefined}
          >
            요약 다시 생성
          </AdminButtonView>
          {isRegenerateBlocked ? <p className={styles.hint}>{REGENERATE_BLOCKED_REASON}</p> : null}
        </div>
      </div>
    </div>
  );
};
