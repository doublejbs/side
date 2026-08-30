import { describe, expect, it } from 'vitest';

import {
  collectDuplicateOfIssueIds,
  duplicateHoldNote,
  loadDuplicateTargets,
  readDuplicateOfIssueId,
  resolveDuplicateHolds,
  sortDuplicateAwareIssues,
  type DuplicateAwareIssue,
  type DuplicateTarget,
} from '@/pipeline/duplicateHold';
import { createFakeIssueRow, createFakePrismaClient } from '@/testing/FakePrismaClient';

const classificationOf = (duplicateOfIssueId?: string) => ({
  isPolicyDebate: true,
  debateScore: 80,
  topic: '노동',
  reason: '정년 제도 변경에 찬반이 갈린다.',
  entities: [],
  keySentences: [],
  keyClaims: [],
  ...(duplicateOfIssueId === undefined ? {} : { duplicateOfIssueId }),
});

const issueOf = (
  id: string,
  { debateScore = 80, duplicateOf, articleCount = 1 }: {
    debateScore?: number | null;
    duplicateOf?: string;
    articleCount?: number;
  } = {},
): DuplicateAwareIssue => ({
  id,
  debateScore,
  classification: classificationOf(duplicateOf),
  articles: Array.from({ length: articleCount }, (_, index) => ({ id: `${id}-a${index}` })),
});

const targetsOf = (...targets: DuplicateTarget[]): Map<string, DuplicateTarget> =>
  new Map(targets.map((target) => [target.id, target]));

describe('readDuplicateOfIssueId', () => {
  it('분류 결과에서 중복 후보 id 를 읽는다', () => {
    expect(readDuplicateOfIssueId(classificationOf('issue-2'))).toBe('issue-2');
  });

  it('중복 표시가 없으면 undefined 를 돌려준다', () => {
    expect(readDuplicateOfIssueId(classificationOf())).toBeUndefined();
  });

  it('형식이 어긋난 값은 없는 것으로 다룬다', () => {
    expect(readDuplicateOfIssueId(null)).toBeUndefined();
    expect(readDuplicateOfIssueId({ duplicateOfIssueId: 'issue-2' })).toBeUndefined();
  });
});

describe('sortDuplicateAwareIssues', () => {
  it('중복 표시가 없는 이슈를 먼저 둔다', () => {
    const sorted = sortDuplicateAwareIssues([
      issueOf('dup', { debateScore: 95, duplicateOf: 'other' }),
      issueOf('clean', { debateScore: 65 }),
    ]);

    expect(sorted.map((issue) => issue.id)).toEqual(['clean', 'dup']);
  });

  it('같은 조건이면 논쟁성 점수 내림차순으로 둔다', () => {
    const sorted = sortDuplicateAwareIssues([
      issueOf('low', { debateScore: 65 }),
      issueOf('high', { debateScore: 95 }),
    ]);

    expect(sorted.map((issue) => issue.id)).toEqual(['high', 'low']);
  });

  it('점수가 같으면 기사 수 내림차순으로 둔다', () => {
    const sorted = sortDuplicateAwareIssues([
      issueOf('few', { articleCount: 2 }),
      issueOf('many', { articleCount: 7 }),
    ]);

    expect(sorted.map((issue) => issue.id)).toEqual(['many', 'few']);
  });

  it('점수가 없는 이슈는 뒤로 보낸다', () => {
    const sorted = sortDuplicateAwareIssues([
      issueOf('unscored', { debateScore: null }),
      issueOf('scored', { debateScore: 60 }),
    ]);

    expect(sorted.map((issue) => issue.id)).toEqual(['scored', 'unscored']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const issues = [issueOf('low', { debateScore: 65 }), issueOf('high', { debateScore: 95 })];

    sortDuplicateAwareIssues(issues);

    expect(issues.map((issue) => issue.id)).toEqual(['low', 'high']);
  });
});

describe('collectDuplicateOfIssueIds', () => {
  it('중복 후보 id 를 중복 없이 모으고 자기 자신은 뺀다', () => {
    const ids = collectDuplicateOfIssueIds([
      issueOf('issue-1', { duplicateOf: 'issue-3' }),
      issueOf('issue-2', { duplicateOf: 'issue-3' }),
      issueOf('issue-4', { duplicateOf: 'issue-4' }),
      issueOf('issue-5'),
    ]);

    expect(ids).toEqual(['issue-3']);
  });
});

describe('resolveDuplicateHolds', () => {
  it('같은 대상 집합 안의 다른 이슈를 가리키면 보류한다', () => {
    const ordered = [issueOf('issue-1'), issueOf('issue-2', { duplicateOf: 'issue-1' })];
    const holds = resolveDuplicateHolds(
      ordered,
      targetsOf({ id: 'issue-1', status: 'DRAFT', question: '정년을 65세로 연장해야 할까?' }),
    );

    expect([...holds]).toEqual([['issue-2', '정년을 65세로 연장해야 할까?']]);
  });

  it('이미 검수·발행 단계인 이슈를 가리키면 보류한다', () => {
    const ordered = [issueOf('issue-1', { duplicateOf: 'issue-old' })];
    const holds = resolveDuplicateHolds(
      ordered,
      targetsOf({ id: 'issue-old', status: 'PUBLISHED', question: '주 4.5일제를 도입해야 할까?' }),
    );

    expect(holds.get('issue-1')).toBe('주 4.5일제를 도입해야 할까?');
  });

  it('대상 집합에도 없고 검수·발행 단계도 아니면 보류하지 않는다', () => {
    const ordered = [issueOf('issue-1', { duplicateOf: 'issue-old' })];
    const holds = resolveDuplicateHolds(
      ordered,
      targetsOf({ id: 'issue-old', status: 'AUTO_REJECTED', question: '예전 질문?' }),
    );

    expect(holds.size).toBe(0);
  });

  it('존재하지 않는 이슈를 가리키면 보류하지 않는다', () => {
    const ordered = [issueOf('issue-1', { duplicateOf: 'ghost' })];

    expect(resolveDuplicateHolds(ordered, targetsOf()).size).toBe(0);
  });

  it('서로를 가리키면 하나만 보류해 둘 다 빠지지 않게 한다', () => {
    const ordered = [
      issueOf('issue-1', { duplicateOf: 'issue-2' }),
      issueOf('issue-2', { duplicateOf: 'issue-1' }),
    ];
    const holds = resolveDuplicateHolds(
      ordered,
      targetsOf(
        { id: 'issue-1', status: 'DRAFT', question: '질문 1?' },
        { id: 'issue-2', status: 'DRAFT', question: '질문 2?' },
      ),
    );

    expect([...holds.keys()]).toEqual(['issue-1']);
  });
});

describe('loadDuplicateTargets', () => {
  it('id 목록이 비어 있으면 조회하지 않는다', async () => {
    const { calls, prisma } = createFakePrismaClient();

    expect((await loadDuplicateTargets(prisma, [])).size).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('중복 후보 이슈의 상태와 질문을 읽는다', async () => {
    const { prisma } = createFakePrismaClient({
      issues: [
        createFakeIssueRow({ id: 'issue-1', status: 'REVIEW', question: '정년을 65세로 연장해야 할까?' }),
        createFakeIssueRow({ id: 'issue-2' }),
      ],
    });

    const targets = await loadDuplicateTargets(prisma, ['issue-1']);

    expect(targets.get('issue-1')).toMatchObject({
      status: 'REVIEW',
      question: '정년을 65세로 연장해야 할까?',
    });
    expect(targets.has('issue-2')).toBe(false);
  });
});

describe('duplicateHoldNote', () => {
  it('보류 사유를 대상 질문과 함께 남긴다', () => {
    expect(duplicateHoldNote('주 4.5일제를 도입해야 할까?')).toBe(
      '[중복으로 보류] 주 4.5일제를 도입해야 할까?',
    );
  });
});
