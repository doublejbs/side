import type { Metadata } from 'next';

import { AppHeaderView } from '@/components/common/AppHeaderView';
import { HeaderActionButtonView } from '@/components/common/HeaderActionButtonView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import { SettingsIcon } from '@/components/common/icons/SettingsIcon';
import { OpinionChangeView } from '@/components/me/OpinionChangeView';
import { ParticipationTilesContainer } from '@/components/me/ParticipationTilesContainer';
import { PerspectiveAxesView } from '@/components/me/PerspectiveAxesView';
import { getIssueRepository } from '@/data/getIssueRepository';
import { OPINION_CHANGES, PARTICIPATION_SUMMARY, PERSPECTIVE_POINTS } from '@/data/perspectiveData';
import type { Issue } from '@/domain/Issue';
import type { OpinionChange } from '@/domain/UserRecord';

import styles from './page.module.css';

/**
 * 공개 화면은 정적으로 미리 만들고 60초마다 다시 만든다(ISR).
 * 검수에서 승인·반려한 결과는 `AdminActions` 의 `revalidatePath` 가 바로 반영한다.
 * 근거: `docs/PipelineSpec.md` 6장.
 */
export const revalidate = 60;

interface OpinionChangeItem {
  change: OpinionChange;
  issue: Issue;
  persuadedClaimTitle: string;
}

export const metadata: Metadata = {
  title: '나 · SIDE',
};

/** `OpinionChange.issueId` 는 이슈의 slug 다. 목 데이터는 id 와 slug 가 같다. */
const buildOpinionChangeItems = async (): Promise<OpinionChangeItem[]> => {
  const repository = getIssueRepository();
  const items = await Promise.all(
    OPINION_CHANGES.map(async (change) => {
      const issue = await repository.getIssueBySlug(change.issueId);

      if (!issue) {
        return [];
      }

      // 이슈를 이미 읽었으므로 주장은 같은 결과에서 찾는다(같은 이슈를 두 번 조회하지 않는다).
      const claim = issue.claims.find((item) => item.id === change.persuadedByClaimId);

      return [{ change, issue, persuadedClaimTitle: claim?.title ?? '' }];
    }),
  );

  return items.flat();
};

const MePage = async () => {
  const opinionChangeItems = await buildOpinionChangeItems();

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
