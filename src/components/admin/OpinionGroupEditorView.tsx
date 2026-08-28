import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { AdminTextAreaFieldView } from '@/components/admin/AdminTextAreaFieldView';
import { AdminTextFieldView } from '@/components/admin/AdminTextFieldView';
import type { OpinionGroup } from '@/domain/Issue';
import { buildOpinionGroupId, getOpinionGroupLabel } from '@/domain/opinionGroupPresenter';
import {
  OPINION_GROUP_COUNT,
  groupDescriptionField,
  groupIdField,
  groupShareField,
} from '@/server/adminFormFields';

import styles from './OpinionGroupEditorView.module.css';

interface Props {
  issueId: string;
  opinionGroups: OpinionGroup[];
}

const SLOTS = Array.from({ length: OPINION_GROUP_COUNT }, (_, index) => index);

/**
 * 슬롯 id 는 이슈 id 와 칸 번호로만 정해지고, 라벨은 그룹 A·B·C 로 고정한다.
 * 빈 그룹이 저장 과정에서 지워져도 다음 렌더에서 칸이 밀리지 않는다.
 */
export const OpinionGroupEditorView = ({ issueId, opinionGroups }: Props) => (
  <AdminSectionView title="의견 그룹" description="비중 합계가 100을 넘지 않도록 조정합니다.">
    <div className={styles.grid}>
      {SLOTS.map((index) => {
        const slotId = buildOpinionGroupId(issueId, index);
        const group = opinionGroups.find((candidate) => candidate.id === slotId);

        return (
          <div key={slotId} className={styles.item}>
            <h3 className={styles.itemTitle}>{getOpinionGroupLabel(index)}</h3>
            <input type="hidden" name={groupIdField(index)} value={slotId} />
            <AdminTextFieldView
              label="비중 (%)"
              name={groupShareField(index)}
              defaultValue={String(group?.share ?? 0)}
              numeric
            />
            <AdminTextAreaFieldView
              label="설명"
              name={groupDescriptionField(index)}
              defaultValue={group?.description ?? ''}
              rows={4}
            />
          </div>
        );
      })}
    </div>
  </AdminSectionView>
);
