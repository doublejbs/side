import { StatTileView } from '@/components/common/StatTileView';

import styles from './ParticipationTilesView.module.css';

interface Props {
  votedCount: number;
  readEvidenceCount: number;
  changedCount: number;
}

export const ParticipationTilesView = ({
  votedCount,
  readEvidenceCount,
  changedCount,
}: Props) => (
  <div className={styles.tiles}>
    <StatTileView value={votedCount} label="투표한 이슈" />
    <StatTileView value={readEvidenceCount} label="읽은 근거" />
    <StatTileView value={changedCount} label="바뀐 생각" />
  </div>
);
