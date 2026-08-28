import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { AdminTextFieldView } from '@/components/admin/AdminTextFieldView';
import { MEDIA_LEANING_LABEL } from '@/components/admin/adminLabels';
import type { MediaPerspective } from '@/domain/Issue';
import { MEDIA_LEANING_ORDER } from '@/domain/mediaLeaningOrder';
import {
  mediaArticleCountField,
  mediaFrameField,
  mediaKeywordsField,
  mediaLeaningField,
  mediaSourceField,
  mediaTitleField,
  mediaUrlField,
} from '@/server/adminFormFields';

import styles from './MediaPerspectiveEditorView.module.css';

interface Props {
  mediaPerspectives: MediaPerspective[];
}

/**
 * 슬롯은 성향으로 짝짓는다. 저장하면서 빈 관점이 지워져도 칸과 성향이 어긋나지 않는다.
 * 각 칸의 hidden `leaning` 이 저장 시 슬롯을 식별한다.
 */
export const MediaPerspectiveEditorView = ({ mediaPerspectives }: Props) => (
  <AdminSectionView
    title="언론 관점"
    description="성향은 매체 평가가 아니라 관점 비교의 그룹핑 기준입니다."
  >
    <div className={styles.grid}>
      {MEDIA_LEANING_ORDER.map((leaning, index) => {
        const perspective = mediaPerspectives.find((item) => item.leaning === leaning);

        return (
          <div key={leaning} className={styles.item}>
            <h3 className={styles.itemTitle}>{MEDIA_LEANING_LABEL[leaning]}</h3>
            <input type="hidden" name={mediaLeaningField(index)} value={leaning} />
            <input
              type="hidden"
              name={mediaArticleCountField(index)}
              defaultValue={String(perspective?.articleCount ?? 0)}
            />
            <input
              type="hidden"
              name={mediaSourceField(index)}
              defaultValue={perspective?.representativeArticle.source ?? ''}
            />
            <AdminTextFieldView
              label="프레임"
              name={mediaFrameField(index)}
              defaultValue={perspective?.frame ?? ''}
            />
            <AdminTextFieldView
              label="키워드"
              name={mediaKeywordsField(index)}
              defaultValue={perspective?.keywords.join(', ') ?? ''}
              description="쉼표로 구분한 3개 정도."
            />
            <AdminTextFieldView
              label="대표 기사 제목"
              name={mediaTitleField(index)}
              defaultValue={perspective?.representativeArticle.title ?? ''}
            />
            <AdminTextFieldView
              label="대표 기사 URL"
              name={mediaUrlField(index)}
              defaultValue={perspective?.representativeArticle.url ?? ''}
              description="비우거나 http·https 주소만 입력합니다."
            />
          </div>
        );
      })}
    </div>
  </AdminSectionView>
);
