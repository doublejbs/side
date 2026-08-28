'use client';

import { SectionTitleView } from '@/components/common/SectionTitleView';
import { OpinionGroupItemView } from '@/components/result/OpinionGroupItemView';
import { useOpinionGroupState } from '@/components/result/useOpinionGroupState';
import type { OpinionGroup } from '@/domain/Issue';
import type { ClaimSummary } from '@/domain/IssueResultSummary';

import styles from './OpinionGroupListView.module.css';

interface Props {
  groups: OpinionGroup[];
  claims: ClaimSummary[];
}

export const OpinionGroupListView = ({ groups, claims }: Props) => {
  const { expandedGroupId, handleToggle } = useOpinionGroupState();

  return (
    <section className={styles.section}>
      <SectionTitleView description="쟁점별 응답 패턴으로 묶은 그룹이에요">
        비슷한 생각을 가진 사람들
      </SectionTitleView>

      <ul className={styles.list}>
        {groups.map((group, index) => (
          <li key={group.id}>
            <OpinionGroupItemView
              group={group}
              claims={claims}
              isClosest={index === 0}
              isExpanded={expandedGroupId === group.id}
              onToggle={handleToggle}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
