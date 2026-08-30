import { EVIDENCE_SUPPORT_LABEL } from '@/components/admin/adminLabels';
import { joinClassNames } from '@/components/common/joinClassNames';
import { EvidenceSupport } from '@/domain/EvidenceSupport';

import styles from './EvidenceSupportBadgeView.module.css';

const TONE_CLASS: Record<EvidenceSupport, string> = {
  [EvidenceSupport.SUPPORTS]: styles.supports,
  [EvidenceSupport.PARTIAL]: styles.partial,
  [EvidenceSupport.UNRELATED]: styles.unrelated,
  [EvidenceSupport.CONTRADICTS]: styles.contradicts,
};

interface Props {
  support: EvidenceSupport;
}

/** verify 단계가 매긴 근거 판정 배지. 아직 검증되지 않은 근거에는 붙이지 않는다. */
export const EvidenceSupportBadgeView = ({ support }: Props) => (
  <span className={joinClassNames(styles.badge, TONE_CLASS[support])}>
    {EVIDENCE_SUPPORT_LABEL[support]}
  </span>
);
