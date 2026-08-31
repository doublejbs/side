import { CardView } from '@/components/common/CardView';
import { getAxisLabels } from '@/domain/perspectiveAxisLabels';
import type { PerspectivePoint } from '@/domain/UserRecord';

import styles from './PerspectiveAxesView.module.css';

interface Props {
  points: PerspectivePoint[];
  /** 카드 상단 안내. 서버 계산일 때만 "축에 반영된 투표 N개 기준" 을 넘긴다. */
  noticeText?: string;
  /** 서버 계산을 불러오지 못했을 때의 안내. 목 값을 대신 비추지 않고 이 문구만 보여준다. */
  errorText?: string;
}

/** 표가 하나도 없어 값을 계산할 수 없는 축에 붙이는 안내. */
export const EMPTY_AXIS_NOTICE = '아직 이 분야 투표가 없어요';

const getAxisLabel = (point: PerspectivePoint): string => {
  const between = `${getAxisLabels(point.axis).name}: ${point.leftLabel}과 ${point.rightLabel} 사이`;

  if (point.value === null) {
    return `${between} ${EMPTY_AXIS_NOTICE}`;
  }

  return `${between} 100 중 ${point.value}`;
};

export const PerspectiveAxesView = ({ points, noticeText, errorText }: Props) => (
  <CardView>
    {errorText ? (
      <p className={styles.error} role="status">
        {errorText}
      </p>
    ) : null}
    {noticeText ? <p className={styles.notice}>{noticeText}</p> : null}
    <ul className={styles.axes}>
      {points.map((point) => (
        <li key={point.axis} className={styles.axis}>
          <div className={styles.labelRow}>
            <span>{point.leftLabel}</span>
            <span className={styles.axisName}>{getAxisLabels(point.axis).name}</span>
            <span>{point.rightLabel}</span>
          </div>
          <div
            className={styles.track}
            role="meter"
            aria-label={getAxisLabel(point)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={point.value ?? undefined}
          >
            {point.value === null ? null : (
              <span className={styles.marker} style={{ left: `${point.value}%` }} />
            )}
          </div>
          {point.value === null ? <p className={styles.emptyAxis}>{EMPTY_AXIS_NOTICE}</p> : null}
        </li>
      ))}
    </ul>
  </CardView>
);
