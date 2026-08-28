import styles from './PageHeroView.module.css';

interface Props {
  title: string;
  description?: string;
}

export const PageHeroView = ({ title, description }: Props) => (
  <section className={styles.hero}>
    <h1 className={styles.title}>{title}</h1>
    {description ? <p className={styles.description}>{description}</p> : null}
  </section>
);
