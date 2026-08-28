import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { AdminButtonView } from '@/components/admin/AdminButtonView';
import { AdminSelectFieldView } from '@/components/admin/AdminSelectFieldView';
import { AdminTextAreaFieldView } from '@/components/admin/AdminTextAreaFieldView';
import { AdminTextFieldView } from '@/components/admin/AdminTextFieldView';
import { EVIDENCE_TYPE_LABEL } from '@/components/admin/adminLabels';
import { formatAdminDate } from '@/components/admin/formatAdminDate';
import { EvidenceType } from '@/domain/EvidenceType';
import { AdminFormField } from '@/server/AdminFormField';
import {
  claimDescriptionField,
  claimTitleField,
  evidenceTypeField,
} from '@/server/adminFormFields';
import type { AdminClaim } from '@/server/AdminStore';

import styles from './ClaimEditorCardView.module.css';

const EVIDENCE_TYPE_OPTIONS = Object.values(EvidenceType).map((type) => ({
  value: type,
  label: EVIDENCE_TYPE_LABEL[type],
}));

interface Props {
  claim: AdminClaim;
  index: number;
  saveClaimAction: (formData: FormData) => Promise<void>;
  updateEvidenceTypeAction: (formData: FormData) => Promise<void>;
  deleteEvidenceAction: (formData: FormData) => Promise<void>;
}

export const ClaimEditorCardView = ({
  claim,
  index,
  saveClaimAction,
  updateEvidenceTypeAction,
  deleteEvidenceAction,
}: Props) => (
  <article className={styles.card}>
    <input type="hidden" name={AdminFormField.CLAIM_IDS} value={claim.id} />
    <header className={styles.header}>
      <h3 className={styles.title}>주장 {index + 1}</h3>
      <AdminButtonView
        formAction={saveClaimAction}
        name={AdminFormField.CLAIM_ID}
        value={claim.id}
        tone={AdminButtonTone.QUIET}
      >
        이 주장만 저장
      </AdminButtonView>
    </header>
    <AdminTextFieldView label="제목" name={claimTitleField(claim.id)} defaultValue={claim.title} />
    <AdminTextAreaFieldView
      label="설명"
      name={claimDescriptionField(claim.id)}
      defaultValue={claim.description}
      rows={4}
    />
    <div className={styles.evidences}>
      <span className={styles.evidenceTitle}>근거 {claim.evidences.length}개</span>
      {claim.evidences.length === 0 ? (
        <p className={styles.empty}>근거가 없습니다. 파이프라인을 다시 실행해 주세요.</p>
      ) : null}
      {claim.evidences.map((evidence) => (
        <div key={evidence.id} className={styles.evidence}>
          <p className={styles.evidenceSummary}>{evidence.summary}</p>
          <p className={styles.evidenceMeta}>
            {evidence.source} · {formatAdminDate(evidence.date)}
          </p>
          <div className={styles.evidenceActions}>
            <AdminSelectFieldView
              label={`근거 타입 (${evidence.summary.slice(0, 12)})`}
              name={evidenceTypeField(evidence.id)}
              options={EVIDENCE_TYPE_OPTIONS}
              defaultValue={evidence.type}
              compact
            />
            <AdminButtonView
              formAction={updateEvidenceTypeAction}
              name={AdminFormField.EVIDENCE_ID}
              value={evidence.id}
              tone={AdminButtonTone.QUIET}
            >
              타입 저장
            </AdminButtonView>
            <AdminButtonView
              formAction={deleteEvidenceAction}
              name={AdminFormField.EVIDENCE_ID}
              value={evidence.id}
              tone={AdminButtonTone.DANGER}
            >
              삭제
            </AdminButtonView>
            <a
              className={styles.evidenceLink}
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              원문
            </a>
          </div>
        </div>
      ))}
    </div>
  </article>
);
