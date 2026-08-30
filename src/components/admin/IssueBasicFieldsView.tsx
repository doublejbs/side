import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { AdminTextAreaFieldView } from '@/components/admin/AdminTextAreaFieldView';
import { AdminTextFieldView } from '@/components/admin/AdminTextFieldView';
import type { KeyPoint } from '@/domain/Issue';
import { AdminFormField } from '@/server/AdminFormField';
import {
  KEY_POINT_COUNT,
  keyPointIdField,
  keyPointQuestionField,
  keyPointTitleField,
} from '@/server/adminFormFields';

import styles from './IssueBasicFieldsView.module.css';

interface Props {
  question: string;
  tags: string[];
  summary: string[];
  keyPoints: KeyPoint[];
}

const KEY_POINT_SLOTS = Array.from({ length: KEY_POINT_COUNT }, (_, index) => index);

export const IssueBasicFieldsView = ({ question, tags, summary, keyPoints }: Props) => (
  <AdminSectionView title="기본 정보" description="질문은 물음표로 끝나는 30자 이내가 좋습니다.">
    <AdminTextFieldView
      label="질문"
      name={AdminFormField.QUESTION}
      defaultValue={question}
      placeholder="예: 정년을 65세로 연장해야 할까?"
    />
    <AdminTextFieldView
      label="태그"
      name={AdminFormField.TAGS}
      defaultValue={tags.join(', ')}
      description="쉼표로 구분합니다."
    />
    <AdminTextAreaFieldView
      label="요약 문장"
      name={AdminFormField.SUMMARY}
      defaultValue={summary.join('\n')}
      rows={6}
      description="한 줄에 한 문장씩. 사실 중심으로 3~5문장."
    />
    <div className={styles.keyPoints}>
      {KEY_POINT_SLOTS.map((index) => {
        const keyPoint = keyPoints[index];

        return (
          <div key={index} className={styles.keyPoint}>
            <input
              type="hidden"
              name={keyPointIdField(index)}
              defaultValue={keyPoint?.id ?? ''}
            />
            <AdminTextFieldView
              label={`쟁점 ${index + 1} 제목`}
              name={keyPointTitleField(index)}
              defaultValue={keyPoint?.title ?? ''}
            />
            <AdminTextFieldView
              label={`쟁점 ${index + 1} 질문`}
              name={keyPointQuestionField(index)}
              defaultValue={keyPoint?.question ?? ''}
            />
          </div>
        );
      })}
    </div>
  </AdminSectionView>
);
