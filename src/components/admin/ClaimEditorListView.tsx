import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { ClaimEditorCardView } from '@/components/admin/ClaimEditorCardView';
import { ClaimSide } from '@/domain/ClaimSide';
import type { AdminClaim } from '@/server/AdminStore';

import styles from './ClaimEditorListView.module.css';

interface Props {
  claims: AdminClaim[];
  saveClaimAction: (formData: FormData) => Promise<void>;
  updateEvidenceTypeAction: (formData: FormData) => Promise<void>;
  deleteEvidenceAction: (formData: FormData) => Promise<void>;
}

const COLUMNS: { side: ClaimSide; label: string }[] = [
  { side: ClaimSide.AGREE, label: '찬성' },
  { side: ClaimSide.DISAGREE, label: '반대' },
];

/** 찬성·반대는 항상 같은 구조·같은 크기로 렌더한다(Equal weight). */
export const ClaimEditorListView = ({
  claims,
  saveClaimAction,
  updateEvidenceTypeAction,
  deleteEvidenceAction,
}: Props) => (
  <AdminSectionView title="주장" description="찬성 3개 · 반대 3개를 같은 무게로 다듬습니다.">
    <div className={styles.columns}>
      {COLUMNS.map(({ side, label }) => (
        <div key={side} className={styles.column}>
          <h3 className={styles.columnTitle}>{label}</h3>
          {claims
            .filter((claim) => claim.side === side)
            .map((claim, index) => (
              <ClaimEditorCardView
                key={claim.id}
                claim={claim}
                index={index}
                saveClaimAction={saveClaimAction}
                updateEvidenceTypeAction={updateEvidenceTypeAction}
                deleteEvidenceAction={deleteEvidenceAction}
              />
            ))}
        </div>
      ))}
    </div>
  </AdminSectionView>
);
