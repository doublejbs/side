import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MePageContainer } from '@/components/me/MePageContainer';
import { EMPTY_AXIS_NOTICE } from '@/components/me/PerspectiveAxesView';
import { PERSPECTIVE_ERROR_TEXT } from '@/components/me/useMePageState';
import type { MyOpinionChange, MyPerspectiveResponse } from '@/domain/MyPerspective';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import type { SessionUser } from '@/domain/SessionUser';
import type { PerspectivePoint } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { useMyPerspective } from '@/store/useMyPerspective';
import { useMyVotes } from '@/store/useMyVotes';
import { useSessionUser } from '@/store/useSessionUser';

vi.mock('@/lib/auth/isAuthEnabled', () => ({ isAuthEnabled: vi.fn() }));
vi.mock('@/store/useSessionUser', () => ({ useSessionUser: vi.fn() }));
vi.mock('@/store/useMyPerspective', () => ({ useMyPerspective: vi.fn() }));
vi.mock('@/store/useMyVotes', () => ({ useMyVotes: vi.fn() }));
vi.mock('@/store/useUserVotes', () => ({ useUserVotes: () => ({}) }));

const isAuthEnabledMock = vi.mocked(isAuthEnabled);
const useSessionUserMock = vi.mocked(useSessionUser);
const useMyPerspectiveMock = vi.mocked(useMyPerspective);
const useMyVotesMock = vi.mocked(useMyVotes);

const USER: SessionUser = {
  id: 'user-1',
  email: 'someone@example.com',
  name: '홍길동',
  avatarUrl: null,
};

const MOCK_POINTS: PerspectivePoint[] = [
  {
    axis: PerspectiveAxis.ECONOMY,
    leftLabel: '시장 중심',
    rightLabel: '정부 역할',
    value: 62,
    voteCount: 4,
  },
];

const MOCK_CHANGE: MyOpinionChange = {
  slug: 'nuclear-expansion',
  question: '원전을 늘려야 할까?',
  before: VoteChoice.DISAGREE,
  beforeAt: '2026-05-21T09:30:00.000Z',
  after: VoteChoice.AGREE,
  afterAt: '2026-08-19T11:05:00.000Z',
  persuadedClaimTitle: '전력 수급이 안정된다',
};

const SERVER_PERSPECTIVE: MyPerspectiveResponse = {
  points: [
    {
      axis: PerspectiveAxis.ECONOMY,
      leftLabel: '시장 중심',
      rightLabel: '정부 역할',
      value: 75,
      voteCount: 3,
    },
    {
      axis: PerspectiveAxis.WELFARE,
      leftLabel: '개인 책임',
      rightLabel: '사회 책임',
      value: null,
      voteCount: 0,
    },
  ],
  changes: [],
  feedbackCount: 9,
};

const renderPage = (isServerEnabled: boolean) =>
  render(
    <MePageContainer
      opinionChanges={[MOCK_CHANGE]}
      perspectivePoints={MOCK_POINTS}
      patternIssueCount={18}
      feedbackCount={42}
      loginHref="/login?next=%2Fme"
      isServerEnabled={isServerEnabled}
    />,
  );

beforeEach(() => {
  isAuthEnabledMock.mockReset().mockReturnValue(true);
  useSessionUserMock.mockReset().mockReturnValue({ user: USER, isLoaded: true });
  useMyPerspectiveMock.mockReset().mockReturnValue({ perspective: null, isLoaded: true });
  useMyVotesMock.mockReset().mockReturnValue({ votes: null, isLoaded: true });
});

describe('MePageContainer 목 모드', () => {
  it('서버 계산이 없으면 목 데이터를 그대로 보여준다', () => {
    renderPage(false);

    expect(screen.getByText(/18개 이슈에서 내가 선택한 패턴이에요/)).toBeInTheDocument();
    expect(screen.getByText('원전을 늘려야 할까?')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText(/축에 반영된 투표/)).not.toBeInTheDocument();
  });
});

describe('MePageContainer 서버 계산', () => {
  beforeEach(() => {
    useMyPerspectiveMock.mockReturnValue({ perspective: SERVER_PERSPECTIVE, isLoaded: true });
    useMyVotesMock.mockReturnValue({
      votes: [
        { slug: 'a', choice: VoteChoice.AGREE, votedAt: '2026-08-01T00:00:00.000Z' },
        { slug: 'b', choice: VoteChoice.DISAGREE, votedAt: '2026-08-02T00:00:00.000Z' },
      ],
      isLoaded: true,
    });
  });

  it('투표가 없는 축은 마커 없이 안내만 보여준다', () => {
    renderPage(true);

    const meters = screen.getAllByRole('meter');

    expect(meters[0].firstElementChild).not.toBeNull();
    expect(meters[1].firstElementChild).toBeNull();
    expect(screen.getByText(EMPTY_AXIS_NOTICE)).toBeInTheDocument();
  });

  it('축에 반영된 표 수로 안내하고 히어로는 투표한 이슈 수를 쓴다', () => {
    renderPage(true);

    expect(screen.getByText('축에 반영된 투표 3개 기준')).toBeInTheDocument();
    expect(screen.getByText(/2개 이슈에서 내가 선택한 패턴이에요/)).toBeInTheDocument();
  });

  it('같은 이슈에서 두 번 바뀐 기록도 각각 보여준다', () => {
    useMyPerspectiveMock.mockReturnValue({
      perspective: {
        ...SERVER_PERSPECTIVE,
        changes: [
          MOCK_CHANGE,
          {
            ...MOCK_CHANGE,
            before: VoteChoice.AGREE,
            beforeAt: '2026-03-02T09:30:00.000Z',
            after: VoteChoice.DISAGREE,
            afterAt: '2026-04-19T11:05:00.000Z',
          },
        ],
      },
      isLoaded: true,
    });

    renderPage(true);

    expect(screen.getAllByText('원전을 늘려야 할까?')).toHaveLength(2);
  });

  it('바뀐 기록이 없으면 안내 카드를 보여준다', () => {
    renderPage(true);

    expect(screen.getByText('생각이 바뀐 기록이 아직 없어요')).toBeInTheDocument();
    expect(screen.queryByText('원전을 늘려야 할까?')).not.toBeInTheDocument();
  });

  it('참여 타일은 투표한 이슈·근거 피드백·바뀐 생각을 보여준다', () => {
    useMyPerspectiveMock.mockReturnValue({
      perspective: { ...SERVER_PERSPECTIVE, changes: [MOCK_CHANGE] },
      isLoaded: true,
    });

    renderPage(true);

    expect(screen.getByText('투표한 이슈')).toBeInTheDocument();
    expect(screen.getByText('근거 피드백')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('바뀐 생각')).toBeInTheDocument();
    expect(screen.getByText('원전을 늘려야 할까?')).toBeInTheDocument();
  });

  it('서버 계산을 기다리는 동안에는 목 값을 비추지 않는다', () => {
    useMyPerspectiveMock.mockReturnValue({ perspective: null, isLoaded: false });

    const { container } = renderPage(true);

    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('내 투표 집계를 기다리는 동안에는 0 을 비추지 않는다', () => {
    useMyVotesMock.mockReturnValue({ votes: null, isLoaded: false });

    const { container } = renderPage(true);

    expect(screen.queryByText(/개 이슈에서 내가 선택한 패턴이에요/)).not.toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

describe('MePageContainer 서버 계산 실패', () => {
  beforeEach(() => {
    useMyPerspectiveMock.mockReturnValue({ perspective: null, isLoaded: true });
    useMyVotesMock.mockReturnValue({
      votes: [{ slug: 'a', choice: VoteChoice.AGREE, votedAt: '2026-08-01T00:00:00.000Z' }],
      isLoaded: true,
    });
  });

  it('계산을 불러오지 못해도 목 데이터로 대신하지 않는다', () => {
    renderPage(true);

    expect(screen.queryByText('원전을 늘려야 할까?')).not.toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
    expect(screen.queryByText(/18개 이슈에서 내가 선택한 패턴이에요/)).not.toBeInTheDocument();
  });

  it('빈 축 5개와 실패 안내를 보여준다', () => {
    renderPage(true);

    const meters = screen.getAllByRole('meter');

    expect(meters).toHaveLength(5);
    expect(meters.every((meter) => meter.firstElementChild === null)).toBe(true);
    expect(screen.getByText(PERSPECTIVE_ERROR_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(/축에 반영된 투표/)).not.toBeInTheDocument();
  });
});

describe('MePageContainer 비로그인', () => {
  it('로그인이 켜져 있는데 세션이 없으면 안내 카드만 보여준다', () => {
    useSessionUserMock.mockReturnValue({ user: null, isLoaded: true });

    renderPage(true);

    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인/ })).toBeInTheDocument();
  });
});
