import styles from './AdminTextAreaFieldView.module.css';

interface Props {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
  rows?: number;
}

export const AdminTextAreaFieldView = ({
  label,
  name,
  defaultValue,
  placeholder,
  description,
  rows = 4,
}: Props) => (
  <label className={styles.field}>
    <span className={styles.label}>{label}</span>
    <textarea
      className={styles.textarea}
      name={name}
      rows={rows}
      defaultValue={defaultValue}
      placeholder={placeholder}
    />
    {description ? <span className={styles.description}>{description}</span> : null}
  </label>
);
