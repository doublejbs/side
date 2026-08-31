'use client';

import { computePerspective } from '@/domain/computePerspective';
import type { MyOpinionChange } from '@/domain/MyPerspective';
import type { SessionUser } from '@/domain/SessionUser';
import type { PerspectivePoint } from '@/domain/UserRecord';
import { useMyPerspective } from '@/store/useMyPerspective';
import { useMyVotes } from '@/store/useMyVotes';
import { useSessionUser } from '@/store/useSessionUser';

interface MePageStateInput {
  /** 서버 저장이 켜져 있는지. 페이지(서버 컴포넌트)가 알려준다. */
  isServerEnabled: boolean;
  /** 목 모드·비로그인에서 그대로 쓰는 관점 축. */
  mockPoints: PerspectivePoint[];
  mockPatternIssueCount: number;
  mockFeedbackCount: number;
  mockChanges: MyOpinionChange[];
}

export interface MePageState {
  user: SessionUser | null;
  isSessionLoaded: boolean;
  /** 서버 계산을 기다리는 중인지. 목 값을 잠깐 비추지 않으려고 화면이 판단을 미룬다. */
  isPerspectiveLoading: boolean;
  points: PerspectivePoint[];
  changes: MyOpinionChange[];
  feedbackCount: number;
  /** 축 카드 상단 안내. 서버 계산일 때만 붙인다. */
  axesNoticeText?: string;
  /** 서버 계산을 불러오지 못했을 때 축 카드에 붙이는 안내. 실패가 아니면 없다. */
  axesErrorText?: string;
  /** 안내 문구에 쓰는 "패턴을 만든 이슈 수". 아직 집계를 모르면(로딩 중) null 이다. */
  patternIssueCount: number | null;
}

/**
 * 서버 계산을 불러오지 못했을 때 축 카드에 붙이는 안내.
 * 목 값으로 대신 채우면 내 기록으로 오해하므로, 빈 축과 함께 실패 사실만 알린다.
 */
export const PERSPECTIVE_ERROR_TEXT = '불러오지 못했어요. 잠시 후 다시 시도해 주세요';

/** 아직 계산이 없거나 불러오지 못했을 때 쓰는 빈 축 5개(값 없음). */
const EMPTY_POINTS: PerspectivePoint[] = computePerspective([]);

/**
 * 축 값에 실제로 반영된 표 수. UNSURE 와 축이 없는 이슈의 표는 애초에 `voteCount` 에 들어오지 않는다.
 * 축이 둘인 이슈는 두 축에 각각 세어지므로 "이슈 수" 가 아니라 "투표 수" 로 적어 라벨과 값을 맞춘다.
 * 근거: docs/PerspectiveSpec.md 3장.
 */
const countAxisVotes = (points: PerspectivePoint[]): number =>
  points.reduce((total, point) => total + point.voteCount, 0);

const buildAxesNotice = (axisVoteCount: number): string =>
  `축에 반영된 투표 ${axisVoteCount}개 기준`;

/**
 * 나 탭이 목 데이터와 서버 계산 중 무엇을 보여줄지 한곳에서 정한다.
 * 목 데이터는 **서버 저장이 꺼져 있거나 비로그인일 때만** 쓴다. 서버 모드 + 로그인이라면
 * 조회에 실패하더라도 목 값을 비추지 않고 빈 축과 실패 안내를 돌려준다.
 * 근거: docs/PerspectiveSpec.md 5장.
 */
export const useMePageState = ({
  isServerEnabled,
  mockPoints,
  mockPatternIssueCount,
  mockFeedbackCount,
  mockChanges,
}: MePageStateInput): MePageState => {
  const { user, isLoaded: isSessionLoaded } = useSessionUser();
  const { perspective, isLoaded: isPerspectiveLoaded } = useMyPerspective(isServerEnabled);
  const { votes, isLoaded: isVotesLoaded } = useMyVotes(isServerEnabled);

  // 서버 저장이 꺼져 있거나 비로그인이면 계산할 내 기록이 없다. 목 데이터를 쓰는 유일한 경우다.
  if (!isServerEnabled || user === null) {
    return {
      user,
      isSessionLoaded,
      isPerspectiveLoading: false,
      points: mockPoints,
      changes: mockChanges,
      feedbackCount: mockFeedbackCount,
      patternIssueCount: mockPatternIssueCount,
    };
  }

  // 관점 계산과 내 투표 집계가 모두 오기 전에는 0 도 목 값도 비추지 않는다.
  if (!isPerspectiveLoaded || !isVotesLoaded) {
    return {
      user,
      isSessionLoaded,
      isPerspectiveLoading: true,
      points: EMPTY_POINTS,
      changes: [],
      feedbackCount: 0,
      patternIssueCount: null,
    };
  }

  const votedIssueCount = votes?.length ?? 0;

  // 조회에 성공하면 항상 본문이 온다. 여기서 null 이면 불러오지 못한 것이다.
  if (perspective === null) {
    return {
      user,
      isSessionLoaded,
      isPerspectiveLoading: false,
      points: EMPTY_POINTS,
      changes: [],
      feedbackCount: 0,
      axesErrorText: PERSPECTIVE_ERROR_TEXT,
      patternIssueCount: votedIssueCount,
    };
  }

  return {
    user,
    isSessionLoaded,
    isPerspectiveLoading: false,
    points: perspective.points,
    changes: perspective.changes,
    feedbackCount: perspective.feedbackCount,
    axesNoticeText: buildAxesNotice(countAxisVotes(perspective.points)),
    patternIssueCount: votedIssueCount,
  };
};
