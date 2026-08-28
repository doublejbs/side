import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { AdminFormField } from '@/server/AdminFormField';

import styles from './SearchQueryCreateFormView.module.css';

interface Props {
  createQueryAction: (formData: FormData) => Promise<void>;
}

export const SearchQueryCreateFormView = ({ createQueryAction }: Props) => (
  <form action={createQueryAction} className={styles.form}>
    <label className={styles.field}>
      <span className={styles.label}>새 키워드</span>
      <input
        className={styles.input}
        type="text"
        name={AdminFormField.KEYWORD}
        placeholder="예: 정년 연장"
      />
    </label>
    <AdminButtonView tone={AdminButtonTone.PRIMARY}>추가</AdminButtonView>
  </form>
);
