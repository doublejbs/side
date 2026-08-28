import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { formatAdminDate } from '@/components/admin/formatAdminDate';
import type { AdminArticle } from '@/server/AdminStore';

import styles from './ReviewArticleListView.module.css';

interface Props {
  articles: AdminArticle[];
}

/** 읽기 전용. 이슈에 묶인 원문 기사를 확인만 한다. */
export const ReviewArticleListView = ({ articles }: Props) => (
  <AdminSectionView title={`원문 기사 ${articles.length}건`}>
    {articles.length === 0 ? (
      <p className={styles.empty}>연결된 기사가 없습니다.</p>
    ) : (
      <ul className={styles.list}>
        {articles.map((article) => (
          <li key={article.id} className={styles.item}>
            <a
              className={styles.title}
              href={article.originalLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {article.title}
            </a>
            <span className={styles.meta}>
              {article.publisher ?? '매체 미상'} · {formatAdminDate(article.publishedAt)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </AdminSectionView>
);
