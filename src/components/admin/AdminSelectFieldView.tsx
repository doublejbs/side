import type { AdminSelectOption } from '@/components/admin/AdminSelectOption';
import { joinClassNames } from '@/components/common/joinClassNames';

import styles from './AdminSelectFieldView.module.css';

interface Props {
  label: string;
  name: string;
  options: AdminSelectOption[];
  defaultValue?: string;
  /** 표 안에서 쓸 때는 라벨을 숨기고 높이를 줄인다. */
  compact?: boolean;
}

export const AdminSelectFieldView = ({
  label,
  name,
  options,
  defaultValue,
  compact = false,
}: Props) => (
  <label className={joinClassNames(styles.field, compact && styles.compact)}>
    <span className={compact ? styles.hiddenLabel : styles.label}>{label}</span>
    <select className={styles.select} name={name} defaultValue={defaultValue}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);
