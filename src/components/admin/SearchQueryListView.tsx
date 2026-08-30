import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { formatAdminDate } from '@/components/admin/formatAdminDate';
import { AdminFormField } from '@/server/AdminFormField';
import type { AdminSearchQuery } from '@/server/AdminStore';

import styles from './SearchQueryListView.module.css';

interface Props {
  queries: AdminSearchQuery[];
  setQueryActiveAction: (formData: FormData) => Promise<void>;
}

export const SearchQueryListView = ({ queries, setQueryActiveAction }: Props) => {
  if (queries.length === 0) {
    return <p className={styles.empty}>등록된 키워드가 없습니다.</p>;
  }

  return (
    <ul className={styles.list}>
      {queries.map((query) => (
        <li key={query.id} className={styles.item}>
          <span className={styles.keyword}>{query.keyword}</span>
          <span className={query.isActive ? styles.active : styles.inactive}>
            {query.isActive ? '수집 중' : '중지'}
          </span>
          <span className={styles.date}>{formatAdminDate(query.createdAt)}</span>
          <form action={setQueryActiveAction}>
            <input type="hidden" name={AdminFormField.QUERY_ID} value={query.id} />
            <input
              type="hidden"
              name={AdminFormField.IS_ACTIVE}
              value={query.isActive ? 'false' : 'true'}
            />
            <AdminButtonView tone={AdminButtonTone.QUIET}>
              {query.isActive ? '중지' : '다시 수집'}
            </AdminButtonView>
          </form>
        </li>
      ))}
    </ul>
  );
};
