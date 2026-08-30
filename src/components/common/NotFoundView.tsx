import { ArrowLinkView } from '@/components/common/ArrowLinkView';

import styles from './NotFoundView.module.css';

export const NotFoundView = () => (
  <main className={styles.page}>
    <h1 className={styles.title}>페이지를 찾을 수 없어요</h1>
    <p className={styles.description}>링크가 잘못되었거나 아직 공개되지 않은 이슈일 수 있어요.</p>
    <ArrowLinkView href="/">홈으로 돌아가기</ArrowLinkView>
  </main>
);
