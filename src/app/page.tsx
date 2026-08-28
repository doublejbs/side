import { AppHeaderView } from '@/components/common/AppHeaderView';
import { HeaderActionButtonView } from '@/components/common/HeaderActionButtonView';
import { PageHeroView } from '@/components/common/PageHeroView';
import { SearchIcon } from '@/components/common/icons/SearchIcon';
import { IssueListView } from '@/components/home/IssueListView';
import { getIssues } from '@/data/IssueRepository';

import styles from './page.module.css';

const HomePage = () => {
  const issues = getIssues();

  return (
    <main className={styles.page}>
      <AppHeaderView
        action={
          <HeaderActionButtonView label="검색">
            <SearchIcon size={20} />
          </HeaderActionButtonView>
        }
      />
      <PageHeroView title="오늘의 이슈" description="지금 사람들이 의견을 나누고 있는 질문들" />
      <IssueListView issues={issues} />
    </main>
  );
};

export default HomePage;
