import type { Metadata } from 'next';

import { MeHeaderView } from '@/components/me/MeHeaderView';
import { MePageContainer } from '@/components/me/MePageContainer';
import { getIssueRepository } from '@/data/getIssueRepository';
import { OPINION_CHANGES, PARTICIPATION_SUMMARY, PERSPECTIVE_POINTS } from '@/data/perspectiveData';
import type { MyOpinionChange } from '@/domain/MyPerspective';
import { buildLoginHref } from '@/lib/auth/buildLoginHref';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { isServerVoteEnabled } from '@/server/isServerVoteEnabled';

import styles from './page.module.css';

/**
 * 공개 화면은 정적으로 미리 만들고 60초마다 다시 만든다(ISR).
 * 검수에서 승인·반려한 결과는 `AdminActions` 의 `revalidatePath` 가 바로 반영한다.
 * 세션은 `MePageContainer` 가 클라이언트에서 읽으므로 로그인을 켜도 정적 렌더가 유지된다.
 * 근거: `docs/PipelineSpec.md` 6장 · `docs/AuthSpec.md` 4.4.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: '나 · SIDE',
};

/**
 * 목 의견 변화를 서버 계산과 같은 모양(`MyOpinionChange`)으로 맞춘다.
 * `OpinionChange.issueId` 는 이슈의 slug 다(목 데이터는 id 와 slug 가 같다).
 */
const buildMockOpinionChanges = async (): Promise<MyOpinionChange[]> => {
  const repository = getIssueRepository();
  const items = await Promise.all(
    OPINION_CHANGES.map(async (change) => {
      const issue = await repository.getIssueBySlug(change.issueId);

      if (!issue) {
        return [];
      }

      // 이슈를 이미 읽었으므로 주장은 같은 결과에서 찾는다(같은 이슈를 두 번 조회하지 않는다).
      const claim = issue.claims.find((item) => item.id === change.persuadedByClaimId);

      return [
        {
          slug: change.issueId,
          question: issue.question,
          before: change.before.choice,
          beforeAt: change.before.votedAt,
          after: change.after.choice,
          afterAt: change.after.votedAt,
          persuadedClaimTitle: claim?.title ?? null,
        },
      ];
    }),
  );

  return items.flat();
};

const MePage = async () => {
  const isServerEnabled = isServerVoteEnabled();
  // 서버 모드에서는 실제 계산이 변화 목록을 채우므로 목 데이터를 읽지 않는다.
  const opinionChanges = isServerEnabled ? [] : await buildMockOpinionChanges();
  const loginHref = buildLoginHref('/me');

  return (
    <main className={styles.page}>
      <MeHeaderView isAuthEnabled={isAuthEnabled()} loginHref={loginHref} />
      <MePageContainer
        opinionChanges={opinionChanges}
        perspectivePoints={PERSPECTIVE_POINTS}
        patternIssueCount={PARTICIPATION_SUMMARY.patternIssueCount}
        feedbackCount={PARTICIPATION_SUMMARY.readEvidenceCount}
        loginHref={loginHref}
        isServerEnabled={isServerEnabled}
      />
    </main>
  );
};

export default MePage;
