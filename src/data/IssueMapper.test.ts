import { describe, expect, it } from 'vitest';

import { mapIssueRow } from '@/data/IssueMapper';
import type { IssueAggregates, IssueRow } from '@/data/IssueMapper';
import { AxisDirection } from '@/domain/AxisDirection';
import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

const createRow = (overrides: Partial<IssueRow> = {}): IssueRow => ({
  id: 'issue-1',
  slug: 'work-week-4-5',
  question: '주 4.5일제를 도입해야 할까?',
  tags: ['노동', '경제'],
  axes: [{ axis: 'LABOR', agreeDirection: 'RIGHT' }],
  summary: ['첫 문장이다.', '둘째 문장이다.', '셋째 문장이다.'],
  keyPoints: [{ id: 'kp-1', title: '노동시간', question: '얼마나 줄어드는가?' }],
  commonCoverage: ['국회 논의가 시작됐다.', '업종별 적용 범위가 쟁점이다.'],
  mediaPerspectives: [
    {
      leaning: 'PROGRESSIVE',
      articleCount: 4,
      frame: '삶의 질',
      keywords: ['휴식', '건강', '가족'],
      representativeArticle: {
        title: '주 4.5일제 논의 본격화',
        source: '한겨레',
        url: 'https://hani.co.kr/1',
      },
    },
  ],
  opinionGroups: [
    {
      id: 'group-a',
      label: '그룹 A',
      share: 42,
      description: '노동시간 단축을 지지한다.',
      agreesWith: ['claim-1'],
      disagreesWith: ['claim-2'],
      mostDivided: ['claim-2'],
    },
  ],
  claims: [
    {
      id: 'claim-2',
      side: 'DISAGREE',
      order: 1,
      title: '기업 비용이 늘어난다',
      description: '인건비 부담이 커진다.',
      evidences: [],
      _count: { feedbacks: 0 },
    },
    {
      id: 'claim-1',
      side: 'AGREE',
      order: 1,
      title: '삶의 질이 높아진다',
      description: '휴식 시간이 늘어난다.',
      evidences: [
        {
          id: 'evidence-1',
          type: 'FACT',
          source: '국회 입법조사처',
          date: new Date('2026-07-14T02:30:00.000Z'),
          summary: '노동시간 통계를 정리한 자료다.',
          url: 'https://example.com/1',
        },
      ],
      _count: { feedbacks: 2 },
    },
  ],
  _count: { articles: 4 },
  ...overrides,
});

const DISTRIBUTION = { agree: 57, disagree: 31, unsure: 12 };

const createAggregates = (overrides: Partial<IssueAggregates> = {}): IssueAggregates => ({
  distribution: DISTRIBUTION,
  participantCount: 0,
  mediaOutletCount: 2,
  ...overrides,
});

describe('mapIssueRow', () => {
  it('분포와 참여자 수는 인자로 받은 집계 값을 그대로 쓴다', () => {
    const issue = mapIssueRow(createRow(), createAggregates({ participantCount: 12481 }));

    expect(issue.distribution).toEqual(DISTRIBUTION);
    expect(issue.participantCount).toBe(12481);
  });

  it('slug 가 비어 있으면 id 를 slug 로 쓴다', () => {
    expect(mapIssueRow(createRow(), createAggregates()).slug).toBe('work-week-4-5');
    expect(mapIssueRow(createRow({ slug: null }), createAggregates()).slug).toBe('issue-1');
  });

  it('주장은 찬성이 먼저 오고 같은 진영 안에서는 order 순으로 정렬된다', () => {
    const issue = mapIssueRow(createRow(), createAggregates());

    expect(issue.claims.map((claim) => claim.id)).toEqual(['claim-1', 'claim-2']);
    expect(issue.claims[0].side).toBe(ClaimSide.AGREE);
    expect(issue.claims[1].side).toBe(ClaimSide.DISAGREE);
  });

  it('설득됐어요 피드백 수는 관계 카운트를 그대로 쓴다', () => {
    const issue = mapIssueRow(createRow(), createAggregates());

    expect(issue.claims[0].persuadedCount).toBe(2);
    expect(issue.claims[1].persuadedCount).toBe(0);
  });

  it('근거 날짜를 한국 시간 기준 YYYY.MM.DD 로 바꾼다', () => {
    const issue = mapIssueRow(createRow(), createAggregates());

    expect(issue.claims[0].evidences[0].date).toBe('2026.07.14');
    expect(issue.claims[0].evidences[0].type).toBe(EvidenceType.FACT);
  });

  it('자정 직전 UTC 시각도 한국 시간 기준 날짜로 바꾼다', () => {
    const row = createRow();

    // row.claims[0] 은 반대 진영(claim-2)이고, 정렬 뒤에는 마지막에 온다.
    row.claims[0].evidences = [
      {
        id: 'evidence-2',
        type: 'RESEARCH',
        source: '한국노동연구원',
        date: new Date('2026-07-14T15:30:00.000Z'),
        summary: '설문 결과다.',
        url: 'https://example.com/2',
      },
    ];

    const issue = mapIssueRow(row, createAggregates());

    expect(issue.claims[1].evidences[0].date).toBe('2026.07.15');
  });

  it('원문 기사 수는 관계 카운트, 매체 수는 집계 값을 쓴다', () => {
    const issue = mapIssueRow(createRow(), createAggregates({ mediaOutletCount: 3 }));

    expect(issue.sourceArticleCount).toBe(4);
    expect(issue.mediaOutletCount).toBe(3);
    expect(issue.coveragePeriodLabel.length).toBeGreaterThan(0);
  });

  it('Json 필드를 도메인 타입으로 검증해 옮긴다', () => {
    const issue = mapIssueRow(createRow(), createAggregates());

    expect(issue.keyPoints).toEqual([
      { id: 'kp-1', title: '노동시간', question: '얼마나 줄어드는가?' },
    ]);
    expect(issue.mediaPerspectives[0].leaning).toBe(MediaLeaning.PROGRESSIVE);
    expect(issue.opinionGroups[0].label).toBe('그룹 A');
    expect(issue.commonCoverage).toHaveLength(2);
  });

  it('검증에서 무관·반박으로 판정된 근거는 앱 응답에서 제외한다', () => {
    const row = createRow();

    row.claims[1].evidences = [
      { ...row.claims[1].evidences[0], id: 'evidence-supports', support: EvidenceSupport.SUPPORTS },
      { ...row.claims[1].evidences[0], id: 'evidence-partial', support: EvidenceSupport.PARTIAL },
      { ...row.claims[1].evidences[0], id: 'evidence-unrelated', support: EvidenceSupport.UNRELATED },
      {
        ...row.claims[1].evidences[0],
        id: 'evidence-contradicts',
        support: EvidenceSupport.CONTRADICTS,
      },
    ];

    const issue = mapIssueRow(row, createAggregates());

    expect(issue.claims[0].evidences.map((evidence) => evidence.id)).toEqual([
      'evidence-supports',
      'evidence-partial',
    ]);
  });

  it('아직 검증되지 않은 근거는 그대로 내보낸다', () => {
    const issue = mapIssueRow(createRow(), createAggregates());

    expect(issue.claims[0].evidences).toHaveLength(1);
    expect(issue.claims[0].evidences[0].support).toBeUndefined();
  });

  it('검증된 근거는 판정을 도메인 enum 으로 옮긴다', () => {
    const row = createRow();

    row.claims[1].evidences[0].support = EvidenceSupport.PARTIAL;

    const issue = mapIssueRow(row, createAggregates());

    expect(issue.claims[0].evidences[0].support).toBe(EvidenceSupport.PARTIAL);
  });

  it('Json 필드가 스키마에 맞지 않으면 빈 배열로 떨어뜨린다', () => {
    const issue = mapIssueRow(
      createRow({ keyPoints: [{ title: 'id 가 없다' }], mediaPerspectives: null, opinionGroups: 'x' }),
      createAggregates(),
    );

    expect(issue.keyPoints).toEqual([]);
    expect(issue.mediaPerspectives).toEqual([]);
    expect(issue.opinionGroups).toEqual([]);
  });
});

describe('mapIssueRow · axes', () => {
  it('저장된 관점 축을 그대로 옮긴다', () => {
    expect(mapIssueRow(createRow(), createAggregates()).axes).toEqual([
      { axis: PerspectiveAxis.LABOR, agreeDirection: AxisDirection.RIGHT },
    ]);
  });

  it('축이 없거나 형식이 어긋나면 빈 배열로 떨어뜨린다', () => {
    expect(mapIssueRow(createRow({ axes: null }), createAggregates()).axes).toEqual([]);
    expect(mapIssueRow(createRow({ axes: [{ axis: '노동' }] }), createAggregates()).axes).toEqual([]);
    expect(
      mapIssueRow(
        createRow({
          axes: [
            { axis: 'LABOR', agreeDirection: 'RIGHT' },
            { axis: 'LABOR', agreeDirection: 'LEFT' },
          ],
        }),
        createAggregates(),
      ).axes,
    ).toEqual([]);
  });
});
