import type { AdminSelectOption } from '@/components/admin/AdminSelectOption';
import { AdminSelectFieldView } from '@/components/admin/AdminSelectFieldView';
import {
  issueAxisAxisField,
  issueAxisDirectionField,
  UNSET_AXIS_VALUE,
} from '@/server/adminFormFields';
import { AxisDirection } from '@/domain/AxisDirection';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { ALL_PERSPECTIVE_AXES, getAxisLabels } from '@/domain/perspectiveAxisLabels';

import styles from './IssueAxisRowView.module.css';

interface Props {
  index: number;
  /** 고르지 않은 칸은 null 이다. */
  axis: PerspectiveAxis | null;
  agreeDirection: AxisDirection;
  onAxisChange: (index: number, value: string) => void;
}

const AXIS_OPTIONS: AdminSelectOption[] = [
  { value: UNSET_AXIS_VALUE, label: '미지정' },
  ...ALL_PERSPECTIVE_AXES.map((axis) => ({ value: axis, label: getAxisLabels(axis).name })),
];

/** 방향 라벨은 고른 축의 실제 좌우 라벨을 그대로 보여준다. 축이 없으면 방향만 적는다. */
const buildDirectionOptions = (axis: PerspectiveAxis | null): AdminSelectOption[] => {
  if (axis === null) {
    return [
      { value: AxisDirection.LEFT, label: '왼쪽' },
      { value: AxisDirection.RIGHT, label: '오른쪽' },
    ];
  }

  const labels = getAxisLabels(axis);

  return [
    { value: AxisDirection.LEFT, label: `왼쪽 · ${labels.leftLabel}` },
    { value: AxisDirection.RIGHT, label: `오른쪽 · ${labels.rightLabel}` },
  ];
};

/** 관점 축 편집 한 행(축 + 찬성 방향). */
export const IssueAxisRowView = ({ index, axis, agreeDirection, onAxisChange }: Props) => {
  const handleAxisChange = (value: string): void => {
    onAxisChange(index, value);
  };

  return (
    <div className={styles.row}>
      <AdminSelectFieldView
        label={`축 ${index + 1}`}
        name={issueAxisAxisField(index)}
        options={AXIS_OPTIONS}
        value={axis ?? UNSET_AXIS_VALUE}
        onChange={handleAxisChange}
      />
      <AdminSelectFieldView
        label={`축 ${index + 1} 찬성 방향`}
        name={issueAxisDirectionField(index)}
        options={buildDirectionOptions(axis)}
        defaultValue={agreeDirection}
      />
    </div>
  );
};
