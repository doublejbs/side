import { CardView } from '@/components/common/CardView';
import type { OpinionGroup } from '@/domain/Issue';
import type { ClaimSummary } from '@/domain/IssueResultSummary';

import styles from './OpinionGroupItemView.module.css';

interface Props {
  group: OpinionGroup;
  claims: ClaimSummary[];
  isClosest: boolean;
  isExpanded: boolean;
  onToggle: (groupId: string) => void;
}

interface DetailSection {
  title: string;
  claimIds: string[];
}

const buildDetailSections = (group: OpinionGroup): DetailSection[] => [
  { title: '이 그룹이 동의하는 주장', claimIds: group.agreesWith },
  { title: '이 그룹이 반대하는 주장', claimIds: group.disagreesWith },
  { title: '가장 의견이 갈리는 주장', claimIds: group.mostDivided },
];

const findClaimTitle = (claims: ClaimSummary[], claimId: string): string =>
  claims.find((claim) => claim.id === claimId)?.title ?? claimId;

export const OpinionGroupItemView = ({
  group,
  claims,
  isClosest,
  isExpanded,
  onToggle,
}: Props) => {
  const detailId = `${group.id}-detail`;

  const handleClick = () => {
    onToggle(group.id);
  };

  return (
    <CardView highlighted={isClosest} className={styles.card}>
      <button
        type="button"
        className={styles.summary}
        aria-expanded={isExpanded}
        aria-controls={detailId}
        onClick={handleClick}
      >
        <span className={styles.share}>
          <span className={styles.shareValue}>{group.share}%</span>
          <span className={styles.shareLabel}>{group.label}</span>
        </span>

        <span className={styles.body}>
          {isClosest ? <span className={styles.badge}>나와 가장 가까움</span> : null}
          <span className={styles.description}>{group.description}</span>
        </span>
      </button>

      <div id={detailId} className={styles.detail} hidden={!isExpanded}>
        {buildDetailSections(group).map((section) => (
          <div key={section.title} className={styles.detailSection}>
            <h3 className={styles.detailTitle}>{section.title}</h3>
            <ul className={styles.claimList}>
              {section.claimIds.map((claimId) => (
                <li key={claimId} className={styles.claimTitle}>
                  {findClaimTitle(claims, claimId)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </CardView>
  );
};
