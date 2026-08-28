import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { AdminSelectFieldView } from '@/components/admin/AdminSelectFieldView';
import {
  MEDIA_LEANING_LABEL,
  UNSET_LEANING_LABEL,
  UNSET_LEANING_VALUE,
} from '@/components/admin/adminLabels';
import type { AdminSelectOption } from '@/components/admin/AdminSelectOption';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { AdminFormField } from '@/server/AdminFormField';
import type { AdminPublisher } from '@/server/AdminStore';

import styles from './PublisherTableView.module.css';

const LEANING_OPTIONS: AdminSelectOption[] = [
  { value: UNSET_LEANING_VALUE, label: UNSET_LEANING_LABEL },
  ...Object.values(MediaLeaning).map((leaning) => ({
    value: leaning,
    label: MEDIA_LEANING_LABEL[leaning],
  })),
];

interface Props {
  publishers: AdminPublisher[];
  savePublisherAction: (formData: FormData) => Promise<void>;
  deletePublisherAction: (formData: FormData) => Promise<void>;
}

/** 행마다 독립된 폼이라 `<table>` 대신 그리드로 표를 만든다(폼은 행을 감쌀 수 없다). */
export const PublisherTableView = ({
  publishers,
  savePublisherAction,
  deletePublisherAction,
}: Props) => (
  <div className={styles.table}>
    <div className={styles.headRow}>
      <span>도메인</span>
      <span>매체명</span>
      <span>성향</span>
      <span />
    </div>
    {publishers.length === 0 ? (
      <p className={styles.empty}>등록된 매체가 없습니다.</p>
    ) : null}
    {publishers.map((publisher) => (
      <form key={publisher.id} action={savePublisherAction} className={styles.row}>
        <input type="hidden" name={AdminFormField.DOMAIN} value={publisher.domain} />
        <span className={styles.domain}>{publisher.domain}</span>
        <input
          className={styles.input}
          type="text"
          name={AdminFormField.NAME}
          defaultValue={publisher.name}
          aria-label={`${publisher.domain} 매체명`}
        />
        <AdminSelectFieldView
          label={`${publisher.domain} 성향`}
          name={AdminFormField.LEANING}
          options={LEANING_OPTIONS}
          defaultValue={publisher.leaning ?? UNSET_LEANING_VALUE}
          compact
        />
        <span className={styles.actions}>
          <AdminButtonView tone={AdminButtonTone.QUIET}>저장</AdminButtonView>
          <AdminButtonView
            formAction={deletePublisherAction}
            name={AdminFormField.PUBLISHER_ID}
            value={publisher.id}
            tone={AdminButtonTone.DANGER}
          >
            삭제
          </AdminButtonView>
        </span>
      </form>
    ))}
  </div>
);
