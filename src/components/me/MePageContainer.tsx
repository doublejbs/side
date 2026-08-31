'use client';

import { AccountCardView } from '@/components/auth/AccountCardView';
import { LoginRequiredView } from '@/components/auth/LoginRequiredView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import { LegalLinksView } from '@/components/legal/LegalLinksView';
import { OpinionChangeEmptyView } from '@/components/me/OpinionChangeEmptyView';
import { OpinionChangeView } from '@/components/me/OpinionChangeView';
import { ParticipationTilesContainer } from '@/components/me/ParticipationTilesContainer';
import { PerspectiveAxesView } from '@/components/me/PerspectiveAxesView';
import { useMePageState } from '@/components/me/useMePageState';
import type { MyOpinionChange } from '@/domain/MyPerspective';
import type { PerspectivePoint } from '@/domain/UserRecord';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';

import styles from './MePageContainer.module.css';

interface Props {
  /** 목 모드·비로그인에서 쓰는 의견 변화. 서버 모드에서는 실제 계산으로 대체된다. */
  opinionChanges: MyOpinionChange[];
  perspectivePoints: PerspectivePoint[];
  /** 관점 축을 계산한 기준 이슈 수. */
  patternIssueCount: number;
  /** 목 모드에서 쓰는 근거 피드백 수. */
  feedbackCount: number;
  loginHref: string;
  /** 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준다. */
  isServerEnabled?: boolean;
}

/**
 * `/me` 본문. 세션을 **클라이언트에서** 읽어 페이지가 정적 렌더로 남게 한다
 * (서버에서 세션을 읽으면 ISR 과 승인 `revalidatePath` 가 무력화된다).
 * 근거: docs/AuthSpec.md 4.4.
 */
export const MePageContainer = ({
  opinionChanges,
  perspectivePoints,
  patternIssueCount,
  feedbackCount,
  loginHref,
  isServerEnabled = false,
}: Props) => {
  const state = useMePageState({
    isServerEnabled,
    mockPoints: perspectivePoints,
    mockPatternIssueCount: patternIssueCount,
    mockFeedbackCount: feedbackCount,
    mockChanges: opinionChanges,
  });

  if (!state.isSessionLoaded) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  // 로그인이 켜져 있는데 세션이 없으면 내 기록을 계산할 수 없으므로 안내 카드만 보여준다.
  if (isAuthEnabled() && !state.user) {
    return (
      <>
        <PageHeroView title="나" />

        <div className={styles.content}>
          <div className={styles.accountBlock}>
            <LoginRequiredView loginHref={loginHref} />
            <LegalLinksView />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeroView
        title="나의 정치 관점"
        description={`${state.patternIssueCount}개 이슈에서 내가 선택한 패턴이에요. 성향 라벨이 아니라 기록입니다.`}
      />

      <div className={styles.content}>
        {state.user ? (
          <div className={styles.accountBlock}>
            <AccountCardView user={state.user} />
            <LegalLinksView />
          </div>
        ) : null}

        {state.isPerspectiveLoading ? (
          <div className={styles.placeholder} aria-busy="true" />
        ) : (
          <>
            <PerspectiveAxesView points={state.points} noticeText={state.axesNoticeText} />

            <section className={styles.section}>
              <SectionTitleView>내 생각이 바뀐 이슈</SectionTitleView>
              {state.changes.length === 0 ? (
                <OpinionChangeEmptyView />
              ) : (
                state.changes.map((change) => (
                  <OpinionChangeView key={change.slug} change={change} />
                ))
              )}
            </section>

            <section className={styles.section}>
              <SectionTitleView>나의 참여</SectionTitleView>
              <ParticipationTilesContainer
                feedbackCount={state.feedbackCount}
                changedCount={state.changes.length}
                isServerEnabled={isServerEnabled}
              />
            </section>
          </>
        )}
      </div>
    </>
  );
};
