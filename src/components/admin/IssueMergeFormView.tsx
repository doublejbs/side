import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { AdminSelectFieldView } from '@/components/admin/AdminSelectFieldView';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { ISSUE_STATUS_LABEL } from '@/components/admin/adminLabels';
import { IssueStatus } from '@/domain/IssueStatus';
import { AdminFormField } from '@/server/AdminFormField';
import type { AdminMergeTarget } from '@/server/AdminStore';

import styles from './IssueMergeFormView.module.css';

interface Props {
  status: IssueStatus;
  /** classify 가 남긴 중복 후보. 목록에 있으면 기본 선택값이 된다. */
  duplicateOfIssueId: string | null;
  targets: AdminMergeTarget[];
  mergeIssueAction: (formData: FormData) => Promise<void>;
}

const SECTION_TITLE = '중복 이슈 병합';

const SECTION_DESCRIPTION = '기사만 대상 이슈로 옮기고, 이 이슈는 반려 처리됩니다.';

const SELECT_LABEL = '병합할 대상 이슈';

const BUTTON_LABEL = '이 이슈를 선택한 이슈에 병합';

/** 병합이 막힌 이유. 버튼 옆 문구와 `title` 툴팁이 같은 문장을 쓴다. */
const MERGE_BLOCKED_REASON = '발행된 이슈는 먼저 반려해야 병합할 수 있어요';

const EMPTY_TARGETS = '최근 30일 안에 병합할 수 있는 이슈가 없습니다.';

/** 대상 후보가 있으면 중복 제안 이슈를, 없으면 가장 최근 이슈를 기본값으로 고른다. */
const resolveDefaultTarget = (
  targets: AdminMergeTarget[],
  duplicateOfIssueId: string | null,
): string => {
  const suggested = targets.find((target) => target.id === duplicateOfIssueId);

  return suggested?.id ?? targets[0]?.id ?? '';
};

/**
 * 검수 폼 안의 병합 카드. 폼이 하나뿐이므로 버튼만 다른 서버 액션으로 제출한다.
 * 근거: `docs/PipelineTieringSpec.md` 11.2.
 */
export const IssueMergeFormView = ({
  status,
  duplicateOfIssueId,
  targets,
  mergeIssueAction,
}: Props) => {
  const isBlocked = status === IssueStatus.PUBLISHED;

  if (targets.length === 0) {
    return (
      <AdminSectionView title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        <p className={styles.hint}>{EMPTY_TARGETS}</p>
      </AdminSectionView>
    );
  }

  return (
    <AdminSectionView title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
      <div className={styles.row}>
        <AdminSelectFieldView
          label={SELECT_LABEL}
          name={AdminFormField.TARGET_ISSUE_ID}
          defaultValue={resolveDefaultTarget(targets, duplicateOfIssueId)}
          options={targets.map((target) => ({
            value: target.id,
            label: `${target.question} (${ISSUE_STATUS_LABEL[target.status]})`,
          }))}
        />
        <AdminButtonView
          formAction={mergeIssueAction}
          disabled={isBlocked}
          title={isBlocked ? MERGE_BLOCKED_REASON : undefined}
        >
          {BUTTON_LABEL}
        </AdminButtonView>
      </div>
      {isBlocked ? <p className={styles.hint}>{MERGE_BLOCKED_REASON}</p> : null}
    </AdminSectionView>
  );
};
