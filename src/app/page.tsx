import { AuthActionContainer } from '@/components/auth/AuthActionContainer';
import { AppHeaderView } from '@/components/common/AppHeaderView';
import { HeaderActionButtonView } from '@/components/common/HeaderActionButtonView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { SearchIcon } from '@/components/common/icons/SearchIcon';
import { IssueListView } from '@/components/home/IssueListView';
import { getIssueRepository } from '@/data/getIssueRepository';
import { buildLoginHref } from '@/lib/auth/buildLoginHref';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';

import styles from './page.module.css';

/**
 * 공개 화면은 정적으로 미리 만들고 60초마다 다시 만든다(ISR).
 * 검수에서 승인·반려한 결과는 `AdminActions` 의 `revalidatePath` 가 바로 반영한다.
 * 세션은 `AuthActionContainer` 가 클라이언트에서 읽으므로 로그인을 켜도 정적 렌더가 유지된다.
 * 근거: `docs/PipelineSpec.md` 6장 · `docs/AuthSpec.md` 4.4.
 */
export const revalidate = 60;

const HomePage = async () => {
  const issues = await getIssueRepository().listPublishedIssues();

  return (
    <main className={styles.page}>
      <AppHeaderView
        action={
          <HeaderActionButtonView label="검색">
            <SearchIcon size={20} />
          </HeaderActionButtonView>
        }
        authAction={
          isAuthEnabled() ? <AuthActionContainer loginHref={buildLoginHref('/')} /> : null
        }
      />
      <PageHeroView title="오늘의 이슈" description="지금 사람들이 의견을 나누고 있는 질문들" />
      <IssueListView issues={issues} />
    </main>
  );
};

export default HomePage;
