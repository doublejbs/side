import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { IssueAxisRowView } from '@/components/admin/IssueAxisRowView';
import type { AxisDirection } from '@/domain/AxisDirection';
import type { PerspectiveAxis } from '@/domain/PerspectiveAxis';

import styles from './IssueAxesEditorView.module.css';

/** 편집 칸 하나. 축을 고르지 않았으면 `axis` 가 null 이다. */
export interface IssueAxisRow {
  axis: PerspectiveAxis | null;
  agreeDirection: AxisDirection;
}

interface Props {
  rows: IssueAxisRow[];
  onAxisChange: (index: number, value: string) => void;
}

/**
 * 이슈가 걸린 관점 축 편집(최대 2행). 승인 전에 관리자가 확인해야 하는 값이다.
 * 근거: `docs/PerspectiveSpec.md` 1장.
 */
export const IssueAxesEditorView = ({ rows, onAxisChange }: Props) => (
  <AdminSectionView
    title="관점 축"
    description="이 질문에 찬성하면 축의 어느 쪽인지 고릅니다. 확신이 없으면 미지정으로 둡니다."
  >
    <div className={styles.rows}>
      {rows.map((row, index) => (
        <IssueAxisRowView
          key={index}
          index={index}
          axis={row.axis}
          agreeDirection={row.agreeDirection}
          onAxisChange={onAxisChange}
        />
      ))}
    </div>
  </AdminSectionView>
);
