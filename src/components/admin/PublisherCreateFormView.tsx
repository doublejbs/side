import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { AdminSelectFieldView } from '@/components/admin/AdminSelectFieldView';
import type { AdminSelectOption } from '@/components/admin/AdminSelectOption';
import { AdminTextFieldView } from '@/components/admin/AdminTextFieldView';
import {
  MEDIA_LEANING_LABEL,
  UNSET_LEANING_LABEL,
  UNSET_LEANING_VALUE,
} from '@/components/admin/adminLabels';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { AdminFormField } from '@/server/AdminFormField';

import styles from './PublisherCreateFormView.module.css';

const LEANING_OPTIONS: AdminSelectOption[] = [
  { value: UNSET_LEANING_VALUE, label: UNSET_LEANING_LABEL },
  ...Object.values(MediaLeaning).map((leaning) => ({
    value: leaning,
    label: MEDIA_LEANING_LABEL[leaning],
  })),
];

interface Props {
  savePublisherAction: (formData: FormData) => Promise<void>;
}

export const PublisherCreateFormView = ({ savePublisherAction }: Props) => (
  <form action={savePublisherAction} className={styles.form}>
    <AdminTextFieldView
      label="도메인"
      name={AdminFormField.DOMAIN}
      placeholder="example.com"
    />
    <AdminTextFieldView label="매체명" name={AdminFormField.NAME} placeholder="예시일보" />
    <AdminSelectFieldView
      label="성향"
      name={AdminFormField.LEANING}
      options={LEANING_OPTIONS}
      defaultValue={UNSET_LEANING_VALUE}
    />
    <AdminButtonView tone={AdminButtonTone.PRIMARY}>추가</AdminButtonView>
  </form>
);
