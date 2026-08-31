import { StatTileView } from '@/components/common/StatTileView';

import styles from './ParticipationTilesView.module.css';

interface Props {
  votedCount: number;
  /** 내가 주장에 남긴 근거 피드백 수. 근거: docs/PerspectiveSpec.md 5장. */
  feedbackCount: number;
  changedCount: number;
}

export const ParticipationTilesView = ({ votedCount, feedbackCount, changedCount }: Props) => (
  <div className={styles.tiles}>
    <StatTileView value={votedCount} label="투표한 이슈" />
    <StatTileView value={feedbackCount} label="근거 피드백" />
    <StatTileView value={changedCount} label="바뀐 생각" />
  </div>
);
