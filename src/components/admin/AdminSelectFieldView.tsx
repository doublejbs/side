import type { ChangeEvent } from 'react';

import type { AdminSelectOption } from '@/components/admin/AdminSelectOption';
import { joinClassNames } from '@/components/common/joinClassNames';

import styles from './AdminSelectFieldView.module.css';

interface Props {
  label: string;
  name: string;
  options: AdminSelectOption[];
  defaultValue?: string;
  /** 고른 값이 다른 칸에 영향을 주는 경우에만 `onChange` 와 함께 넘긴다(제어 컴포넌트). */
  value?: string;
  onChange?: (value: string) => void;
  /** 표 안에서 쓸 때는 라벨을 숨기고 높이를 줄인다. */
  compact?: boolean;
}

export const AdminSelectFieldView = ({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
  compact = false,
}: Props) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange?.(event.target.value);
  };

  return (
    <label className={joinClassNames(styles.field, compact && styles.compact)}>
      <span className={compact ? styles.hiddenLabel : styles.label}>{label}</span>
      <select
        className={styles.select}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? handleChange : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};
