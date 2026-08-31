import Link from 'next/link';

import { AdminSectionView } from '@/components/admin/AdminSectionView';
import { formatAdminDate } from '@/components/admin/formatAdminDate';
import { AxisDirection } from '@/domain/AxisDirection';
import type { IssueAxis } from '@/domain/IssueAxis';
import type { IssueClassification } from '@/domain/IssueClassification';
import { getAxisLabels } from '@/domain/perspectiveAxisLabels';

import styles from './IssueClassificationCardView.module.css';

interface Props {
  classification: IssueClassification | null;
  debateScore: number | null;
  topic: string | null;
  classifiedAt: Date | null;
  verifiedAt: Date | null;
}

const SECTION_TITLE = '분류 결과';

const SECTION_DESCRIPTION = 'classify 단계가 매긴 값입니다. 여기서는 편집할 수 없습니다.';

const EMPTY_VALUE = '–';

const formatTimestamp = (date: Date | null): string => (date ? formatAdminDate(date) : EMPTY_VALUE);

/** classify 가 제안한 축의 방향을 사람이 읽는 문구로 옮긴다. 방향은 그 축의 실제 좌우 라벨로 적는다. */
const formatIssueAxis = (issueAxis: IssueAxis): string => {
  const { name, leftLabel, rightLabel } = getAxisLabels(issueAxis.axis);
  const directionLabel = issueAxis.agreeDirection === AxisDirection.LEFT ? leftLabel : rightLabel;

  return `${name} · 찬성이면 ${directionLabel}`;
};

/**
 * 검수 폼 상단의 읽기 전용 분류 카드.
 * 점수·주제는 목록과 같은 값을 쓰되, 저장된 분류 전문이 있으면 판정 근거까지 함께 보여준다.
 * 근거: `docs/PipelineTieringSpec.md` 5장.
 */
export const IssueClassificationCardView = ({
  classification,
  debateScore,
  topic,
  classifiedAt,
  verifiedAt,
}: Props) => {
  if (!classification) {
    return (
      <AdminSectionView title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        <p className={styles.empty}>아직 분류되지 않음</p>
      </AdminSectionView>
    );
  }

  return (
    <AdminSectionView title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
      <div className={styles.card}>
        <div className={styles.summary}>
          <div className={styles.score}>
            <span className={styles.scoreValue}>{debateScore ?? classification.debateScore}</span>
            <span className={styles.scoreLabel}>논쟁성 점수</span>
          </div>
          <div className={styles.summaryBody}>
            <p className={styles.topic}>{topic ?? classification.topic}</p>
            <p className={styles.reason}>{classification.reason}</p>
          </div>
        </div>

        {classification.duplicateOfIssueId ? (
          <p className={styles.duplicate}>
            같은 이슈일 수 있습니다.{' '}
            <Link
              className={styles.duplicateLink}
              href={`/admin/issues/${classification.duplicateOfIssueId}`}
            >
              중복 후보 이슈 열기
            </Link>
          </p>
        ) : null}

        <div className={styles.block}>
          <h3 className={styles.blockTitle}>핵심 문장</h3>
          <ul className={styles.list}>
            {classification.keySentences.map((sentence) => (
              <li key={sentence} className={styles.listItem}>
                {sentence}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.block}>
          <h3 className={styles.blockTitle}>핵심 주장</h3>
          <ul className={styles.list}>
            {classification.keyClaims.map((claim) => (
              <li key={claim} className={styles.listItem}>
                {claim}
              </li>
            ))}
          </ul>
        </div>

        {classification.axes && classification.axes.length > 0 ? (
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>제안 축</h3>
            <div className={styles.chips}>
              {classification.axes.map((issueAxis) => (
                <span key={issueAxis.axis} className={styles.chip}>
                  {formatIssueAxis(issueAxis)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className={styles.block}>
          <h3 className={styles.blockTitle}>인물·기관</h3>
          <div className={styles.chips}>
            {classification.entities.map((entity) => (
              <span key={entity} className={styles.chip}>
                {entity}
              </span>
            ))}
          </div>
        </div>

        <p className={styles.timestamps}>
          분류 {formatTimestamp(classifiedAt)} · 검증 {formatTimestamp(verifiedAt)}
        </p>
      </div>
    </AdminSectionView>
  );
};
