'use client';

import { AccountCardView } from '@/components/auth/AccountCardView';
import { LoginRequiredView } from '@/components/auth/LoginRequiredView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import { LegalLinksView } from '@/components/legal/LegalLinksView';
import { OpinionChangeView } from '@/components/me/OpinionChangeView';
import { ParticipationTilesContainer } from '@/components/me/ParticipationTilesContainer';
import { PerspectiveAxesView } from '@/components/me/PerspectiveAxesView';
import type { OpinionChange, PerspectivePoint } from '@/domain/UserRecord';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { useSessionUser } from '@/store/useSessionUser';

import styles from './MePageContainer.module.css';

/** 서버가 목 데이터와 이슈 조회 결과를 합쳐 넘기는 항목. 이슈는 질문만 쓰므로 질문만 받는다. */
export interface MeOpinionChangeItem {
  change: OpinionChange;
  question: string;
  persuadedClaimTitle: string;
}

interface Props {
  opinionChangeItems: MeOpinionChangeItem[];
  perspectivePoints: PerspectivePoint[];
  /** 관점 축을 계산한 기준 이슈 수. */
  patternIssueCount: number;
  readEvidenceCount: number;
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
  opinionChangeItems,
  perspectivePoints,
  patternIssueCount,
  readEvidenceCount,
  loginHref,
  isServerEnabled = false,
}: Props) => {
  const { user, isLoaded } = useSessionUser();

  if (!isLoaded) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  // 로그인이 켜져 있는데 세션이 없으면 내 기록을 계산할 수 없으므로 안내 카드만 보여준다.
  if (isAuthEnabled() && !user) {
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
        description={`${patternIssueCount}개 이슈에서 내가 선택한 패턴이에요. 성향 라벨이 아니라 기록입니다.`}
      />

      <div className={styles.content}>
        {user ? (
          <div className={styles.accountBlock}>
            <AccountCardView user={user} />
            <LegalLinksView />
          </div>
        ) : null}

        <PerspectiveAxesView points={perspectivePoints} />

        <section className={styles.section}>
          <SectionTitleView>내 생각이 바뀐 이슈</SectionTitleView>
          {opinionChangeItems.map((item) => (
            <OpinionChangeView
              key={item.change.issueId}
              change={item.change}
              question={item.question}
              persuadedClaimTitle={item.persuadedClaimTitle}
            />
          ))}
        </section>

        <section className={styles.section}>
          <SectionTitleView>나의 참여</SectionTitleView>
          <ParticipationTilesContainer
            readEvidenceCount={readEvidenceCount}
            changedCount={opinionChangeItems.length}
            isServerEnabled={isServerEnabled}
          />
        </section>
      </div>
    </>
  );
};
