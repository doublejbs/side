import styles from './AdminTextFieldView.module.css';

interface Props {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
  /** 숫자 입력이 필요한 칸(share, 기사 수)에서 쓴다. */
  numeric?: boolean;
}

export const AdminTextFieldView = ({
  label,
  name,
  defaultValue,
  placeholder,
  description,
  numeric = false,
}: Props) => (
  <label className={styles.field}>
    <span className={styles.label}>{label}</span>
    <input
      className={styles.input}
      type={numeric ? 'number' : 'text'}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      min={numeric ? 0 : undefined}
      max={numeric ? 100 : undefined}
    />
    {description ? <span className={styles.description}>{description}</span> : null}
  </label>
);
