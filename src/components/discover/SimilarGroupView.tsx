import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import { SectionTitleView } from '@/components/common/SectionTitleView';
import type { OpinionGroupSummary } from '@/domain/OpinionGroupSummary';

import styles from './SimilarGroupView.module.css';

interface Props {
  group: OpinionGroupSummary;
  votedCount: number;
  /** 비로그인이라 내 투표를 쓸 수 없을 때의 로그인 경로. 없으면 게이트가 없다. */
  loginHref?: string;
}

const TITLE = '내 생각과 비슷한 그룹';

const EMPTY_DESCRIPTION = '이슈에 참여하면 비슷한 그룹을 찾아드려요';

const LOGIN_DESCRIPTION = '로그인하면 내 생각과 비슷한 그룹을 찾아드려요';

export const SimilarGroupView = ({ group, votedCount, loginHref }: Props) => {
  if (loginHref) {
    return (
      <section className={styles.section}>
        <SectionTitleView>{TITLE}</SectionTitleView>
        <CardView className={styles.card}>
          <p className={styles.description}>{LOGIN_DESCRIPTION}</p>
          <ArrowLinkView href={loginHref}>로그인하기</ArrowLinkView>
        </CardView>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <SectionTitleView
        description={votedCount > 0 ? `참여한 ${votedCount}개 이슈 기반` : undefined}
      >
        {TITLE}
      </SectionTitleView>
      {votedCount > 0 ? (
        <CardView as={CardElement.ARTICLE} className={styles.card} highlighted>
          <div className={styles.groupRow}>
            <span className={styles.share}>{group.share}%</span>
            <span className={styles.label}>{group.label}</span>
          </div>
          <p className={styles.description}>{group.description}</p>
        </CardView>
      ) : (
        <CardView className={styles.card}>
          <p className={styles.description}>{EMPTY_DESCRIPTION}</p>
          <ArrowLinkView href="/">이슈 보러 가기</ArrowLinkView>
        </CardView>
      )}
    </section>
  );
};
