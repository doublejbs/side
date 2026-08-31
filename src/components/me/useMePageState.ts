'use client';

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
  /** 안내 문구에 쓰는 "패턴을 만든 이슈 수". 서버 모드에서는 내가 투표한 이슈 수다. */
  patternIssueCount: number;
}

const buildAxesNotice = (votedCount: number): string => `내 투표 ${votedCount}개 기준`;

/**
 * 나 탭이 목 데이터와 서버 계산 중 무엇을 보여줄지 한곳에서 정한다.
 * 서버 저장이 켜져 있고 로그인 상태라 `GET /api/me/perspective` 가 값을 준 경우에만 실제 계산을 쓰고,
 * 목 모드·비로그인·조회 실패에서는 기존 목 데이터 동작을 유지한다.
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
  const { votes } = useMyVotes(isServerEnabled);

  if (perspective === null) {
    return {
      user,
      isSessionLoaded,
      isPerspectiveLoading: isServerEnabled && !isPerspectiveLoaded,
      points: mockPoints,
      changes: mockChanges,
      feedbackCount: mockFeedbackCount,
      patternIssueCount: mockPatternIssueCount,
    };
  }

  const votedCount = votes?.length ?? 0;

  return {
    user,
    isSessionLoaded,
    isPerspectiveLoading: false,
    points: perspective.points,
    changes: perspective.changes,
    feedbackCount: perspective.feedbackCount,
    axesNoticeText: buildAxesNotice(votedCount),
    patternIssueCount: votedCount,
  };
};
