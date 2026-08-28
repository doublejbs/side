import styles from './StatTileView.module.css';

interface Props {
  value: string | number;
  label: string;
}

export const StatTileView = ({ value, label }: Props) => (
  <div className={styles.tile}>
    <span className={styles.value}>{value}</span>
    <span className={styles.label}>{label}</span>
  </div>
);
