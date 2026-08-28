import Link from 'next/link';

import styles from './IssueQuestionLinkView.module.css';

interface Props {
  issueId: string;
  question: string;
}

/** 발견 화면의 이슈 카드에서 질문 자체가 이슈 상세 링크가 되는 제목. */
export const IssueQuestionLinkView = ({ issueId, question }: Props) => (
  <h3 className={styles.questionHeading}>
    <Link href={`/issues/${issueId}`} className={styles.question}>
      {question}
    </Link>
  </h3>
);
