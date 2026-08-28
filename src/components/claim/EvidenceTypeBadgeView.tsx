import { EvidenceType } from '@/domain/EvidenceType';

import styles from './EvidenceTypeBadgeView.module.css';

interface Props {
  type: EvidenceType;
}

const TYPE_CLASS: Record<EvidenceType, string> = {
  [EvidenceType.FACT]: styles.fact,
  [EvidenceType.RESEARCH]: styles.research,
  [EvidenceType.EXPERT]: styles.expert,
  [EvidenceType.CLAIM]: styles.claim,
};

/** 영문 배지 옆에 노출하지 않고 title로만 제공하는 한글 보조 라벨. */
const TYPE_LABEL: Record<EvidenceType, string> = {
  [EvidenceType.FACT]: '사실',
  [EvidenceType.RESEARCH]: '연구',
  [EvidenceType.EXPERT]: '전문가 의견',
  [EvidenceType.CLAIM]: '주장',
};

export const EvidenceTypeBadgeView = ({ type }: Props) => (
  <span className={`${styles.badge} ${TYPE_CLASS[type]}`} title={TYPE_LABEL[type]}>
    {type}
  </span>
);
