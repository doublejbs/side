import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { VoteChoice } from '@/domain/VoteChoice';
import type { OpinionChange, PerspectivePoint } from '@/domain/UserRecord';

interface ParticipationSummary {
  /** 관점 축을 계산한 기준 이슈 수. */
  patternIssueCount: number;
  /** 사용자가 읽은 근거 수. */
  readEvidenceCount: number;
}

/** 나 탭 참여 요약 목 데이터. 투표 수만 localStorage 기록으로 대체된다. */
export const PARTICIPATION_SUMMARY: ParticipationSummary = {
  patternIssueCount: 18,
  readEvidenceCount: 42,
};

/** 목 관점 축. `voteCount` 합이 `PARTICIPATION_SUMMARY.patternIssueCount` 와 맞도록 둔다. */
export const PERSPECTIVE_POINTS: PerspectivePoint[] = [
  {
    axis: PerspectiveAxis.ECONOMY,
    leftLabel: '시장 중심',
    rightLabel: '정부 역할',
    value: 62,
    voteCount: 4,
  },
  {
    axis: PerspectiveAxis.WELFARE,
    leftLabel: '개인 책임',
    rightLabel: '사회 책임',
    value: 28,
    voteCount: 3,
  },
  {
    axis: PerspectiveAxis.LABOR,
    leftLabel: '기업 중심',
    rightLabel: '노동자 중심',
    value: 70,
    voteCount: 5,
  },
  {
    axis: PerspectiveAxis.ENVIRONMENT,
    leftLabel: '성장',
    rightLabel: '환경',
    value: 34,
    voteCount: 3,
  },
  {
    axis: PerspectiveAxis.DIPLOMACY,
    leftLabel: '현실주의',
    rightLabel: '이상주의',
    value: 58,
    voteCount: 3,
  },
];

export const OPINION_CHANGES: OpinionChange[] = [
  {
    issueId: 'nuclear-expansion',
    before: {
      issueId: 'nuclear-expansion',
      choice: VoteChoice.DISAGREE,
      votedAt: '2026-05-21T09:30:00.000Z',
    },
    after: {
      issueId: 'nuclear-expansion',
      choice: VoteChoice.AGREE,
      votedAt: '2026-08-19T11:05:00.000Z',
    },
    persuadedByClaimId: 'nuclear-agree-1',
  },
];
