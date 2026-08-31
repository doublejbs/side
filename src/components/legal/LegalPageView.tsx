import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import type { LegalSection } from '@/components/legal/LegalSection';

import styles from './LegalPageView.module.css';

interface Props {
  title: string;
  /** 시행일. 사람이 읽는 형태 그대로 받는다. 예: `2026년 8월 31일` */
  updatedAt: string;
  sections: LegalSection[];
}

/** 개인정보처리방침·이용약관이 함께 쓰는 문서 레이아웃. 내용은 상수 모듈이 정한다. */
export const LegalPageView = ({ title, updatedAt, sections }: Props) => (
  <main className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.effectiveDate}>시행일 {updatedAt}</p>
    </header>

    <div className={styles.sections}>
      {sections.map(({ heading, paragraphs, items }) => (
        <section key={heading} className={styles.section}>
          <h2 className={styles.heading}>{heading}</h2>

          {paragraphs.map((paragraph) => (
            <p key={paragraph} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}

          {items ? (
            <ul className={styles.items}>
              {items.map((item) => (
                <li key={item} className={styles.item}>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>

    <ArrowLinkView className={styles.homeLink} href="/">
      홈으로 돌아가기
    </ArrowLinkView>
  </main>
);
