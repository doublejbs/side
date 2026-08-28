import { CardView } from '@/components/common/CardView';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import type { PerspectivePoint } from '@/domain/UserRecord';

import styles from './PerspectiveAxesView.module.css';

interface Props {
  points: PerspectivePoint[];
}

const AXIS_NAME: Record<PerspectiveAxis, string> = {
  [PerspectiveAxis.ECONOMY]: '경제',
  [PerspectiveAxis.WELFARE]: '복지',
  [PerspectiveAxis.LABOR]: '노동',
  [PerspectiveAxis.ENVIRONMENT]: '환경',
  [PerspectiveAxis.DIPLOMACY]: '외교',
};

const getAxisLabel = (point: PerspectivePoint): string =>
  `${AXIS_NAME[point.axis]}: ${point.leftLabel}과 ${point.rightLabel} 사이 100 중 ${point.value}`;

export const PerspectiveAxesView = ({ points }: Props) => (
  <CardView>
    <ul className={styles.axes}>
      {points.map((point) => (
        <li key={point.axis} className={styles.axis}>
          <div className={styles.labelRow}>
            <span>{point.leftLabel}</span>
            <span className={styles.axisName}>{AXIS_NAME[point.axis]}</span>
            <span>{point.rightLabel}</span>
          </div>
          <div
            className={styles.track}
            role="meter"
            aria-label={getAxisLabel(point)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={point.value}
          >
            <span className={styles.marker} style={{ left: `${point.value}%` }} />
          </div>
        </li>
      ))}
    </ul>
  </CardView>
);
