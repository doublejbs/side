import type { Metadata } from 'next';

import { AppHeaderView } from '@/components/common/AppHeaderView';
import { HeaderActionButtonView } from '@/components/common/HeaderActionButtonView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import { SettingsIcon } from '@/components/common/icons/SettingsIcon';
import { OpinionChangeView } from '@/components/me/OpinionChangeView';
import { ParticipationTilesContainer } from '@/components/me/ParticipationTilesContainer';
import { PerspectiveAxesView } from '@/components/me/PerspectiveAxesView';
import { getClaimById, getIssueById } from '@/data/IssueRepository';
import { OPINION_CHANGES, PARTICIPATION_SUMMARY, PERSPECTIVE_POINTS } from '@/data/perspectiveData';
import type { Issue } from '@/domain/Issue';
import type { OpinionChange } from '@/domain/UserRecord';

import styles from './page.module.css';

interface OpinionChangeItem {
  change: OpinionChange;
  issue: Issue;
  persuadedClaimTitle: string;
}

export const metadata: Metadata = {
  title: '나 · SIDE',
};

const buildOpinionChangeItems = (): OpinionChangeItem[] =>
  OPINION_CHANGES.flatMap((change) => {
    const issue = getIssueById(change.issueId);

    if (!issue) {
      return [];
    }

    const claim = getClaimById(change.issueId, change.persuadedByClaimId);

    return [{ change, issue, persuadedClaimTitle: claim?.title ?? '' }];
  });

const MePage = () => {
  const opinionChangeItems = buildOpinionChangeItems();

  return (
    <main className={styles.page}>
      <AppHeaderView
        action={
          <HeaderActionButtonView label="설정">
            <SettingsIcon size={20} />
          </HeaderActionButtonView>
        }
      />
      <PageHeroView
        title="나의 정치 관점"
        description={`${PARTICIPATION_SUMMARY.patternIssueCount}개 이슈에서 내가 선택한 패턴이에요. 성향 라벨이 아니라 기록입니다.`}
      />

      <div className={styles.content}>
        <PerspectiveAxesView points={PERSPECTIVE_POINTS} />

        <section className={styles.section}>
          <SectionTitleView>내 생각이 바뀐 이슈</SectionTitleView>
          {opinionChangeItems.map((item) => (
            <OpinionChangeView
              key={item.change.issueId}
              change={item.change}
              issue={item.issue}
              persuadedClaimTitle={item.persuadedClaimTitle}
            />
          ))}
        </section>

        <section className={styles.section}>
          <SectionTitleView>나의 참여</SectionTitleView>
          <ParticipationTilesContainer
            readEvidenceCount={PARTICIPATION_SUMMARY.readEvidenceCount}
            changedCount={opinionChangeItems.length}
          />
        </section>
      </div>
    </main>
  );
};

export default MePage;
