import { ArrowLinkView } from '@/components/common/ArrowLinkView';
import { CardElement } from '@/components/common/CardElement';
import { CardTone } from '@/components/common/CardTone';
import { CardView } from '@/components/common/CardView';
import { ChipView } from '@/components/common/ChipView';
import type { MediaPerspective } from '@/domain/Issue';
import { MediaLeaning } from '@/domain/MediaLeaning';

import styles from './MediaPerspectiveView.module.css';

interface Props {
  perspectives: MediaPerspective[];
  commonCoverage: string[];
  mediaOutletCount: number;
  coveragePeriodLabel: string;
}

/** 매체 성향 라벨. 특정 매체를 평가하지 않고 보도 성향 묶음만 표시한다. */
const LEANING_LABEL: Record<MediaLeaning, string> = {
  [MediaLeaning.PROGRESSIVE]: '진보 성향 매체',
  [MediaLeaning.CENTRIST]: '중도 성향 매체',
  [MediaLeaning.CONSERVATIVE]: '보수 성향 매체',
};

export const MediaPerspectiveView = ({
  perspectives,
  commonCoverage,
  mediaOutletCount,
  coveragePeriodLabel,
}: Props) => {
  // 언론 관점이 없으면 섹션을 렌더하지 않는다
  if (perspectives.length === 0) {
    return null;
  }

  /** 이슈 상세 상단의 "원문 기사"(핵심 출처)와 달리 성향 비교를 위해 수집한 기사 전체 수다. */
  const analyzedArticleCount = perspectives.reduce(
    (sum, perspective) => sum + perspective.articleCount,
    0,
  );

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h2 className={styles.title}>언론은 어떻게 다르게 보도했을까요?</h2>
        <p className={styles.subtitle}>
          {`${coveragePeriodLabel} · ${mediaOutletCount}개 매체 · 분석 기사 ${analyzedArticleCount}건`}
        </p>
      </div>

      {perspectives.map((perspective) => (
        <CardView key={perspective.leaning} as={CardElement.ARTICLE} className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.leaningLabel}>{LEANING_LABEL[perspective.leaning]}</h3>
            <span className={styles.articleCount}>기사 {perspective.articleCount}건</span>
          </div>

          <div className={styles.block}>
            <span className={styles.blockLabel}>주요 프레임</span>
            <p className={styles.frame}>{perspective.frame}</p>
          </div>

          <div className={styles.keywordBlock}>
            <span className={styles.blockLabel}>반복 키워드</span>
            <ul className={styles.keywords}>
              {perspective.keywords.map((keyword, index) => (
                <li key={`${index}-${keyword}`}>
                  <ChipView>{keyword}</ChipView>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.cardFooter}>
            <span className={styles.articleCount}>대표 기사 1건</span>
            <ArrowLinkView
              className={styles.articleLink}
              href={perspective.representativeArticle.url}
              external
              ariaLabel={`${perspective.representativeArticle.title} 원문 보기`}
            >
              원문 보기
            </ArrowLinkView>
          </div>
        </CardView>
      ))}

      <CardView as={CardElement.SECTION} tone={CardTone.BRAND} className={styles.commonCard}>
        <h3 className={styles.commonTitle}>공통적으로 다룬 내용</h3>
        <ul className={styles.commonList}>
          {commonCoverage.map((coverage, index) => (
            <li key={`${index}-${coverage}`} className={styles.commonItem}>
              <span className={styles.bullet} aria-hidden="true">
                •
              </span>
              <span>{coverage}</span>
            </li>
          ))}
        </ul>
      </CardView>
    </section>
  );
};
