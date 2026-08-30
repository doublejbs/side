import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { AdminActionError } from '@/server/AdminActionError';
import { AdminMessage } from '@/server/AdminMessage';
import type { AdminIssueDetail } from '@/server/AdminStore';
import { InMemoryAdminStore } from '@/server/InMemoryAdminStore';
import { PUBLIC_PAGE_TARGETS, type PublicPageTarget } from '@/server/PublicPageTargets';

import {
  addSearchQuery,
  assertReviewable,
  deleteEvidence,
  parseLineList,
  parseTagList,
  publishIssue,
  rejectIssue,
  saveClaim,
  saveIssue,
  savePublisher,
  updateEvidenceType,
  type MediaPerspectiveInput,
  type SaveIssueInput,
} from './adminUseCases';

const createIssue = (overrides: Partial<AdminIssueDetail> = {}): AdminIssueDetail => ({
  id: 'issue-1',
  status: IssueStatus.REVIEW,
  slug: null,
  question: '정년을 연장해야 할까?',
  tags: [],
  summary: [],
  keyPoints: [],
  commonCoverage: [],
  mediaPerspectives: [],
  opinionGroups: [
    {
      id: 'group-a',
      label: '그룹 A',
      share: 40,
      description: '설명 A',
      agreesWith: ['claim-1'],
      disagreesWith: ['claim-2'],
      mostDivided: ['claim-3'],
    },
  ],
  reviewNote: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  publishedAt: null,
  claims: [
    {
      id: 'claim-1',
      side: ClaimSide.AGREE,
      order: 1,
      title: '찬성',
      description: '설명',
      evidences: [],
    },
  ],
  articles: [],
  ...overrides,
});

const createSaveInput = (overrides: Partial<SaveIssueInput> = {}): SaveIssueInput => ({
  issueId: 'issue-1',
  question: '  정년을 연장해야 할까?  ',
  tags: '노동, 고용 , ,연금',
  summary: '첫 문장\n\n  둘째 문장  ',
  keyPoints: [{ id: '', title: '쟁점 1', question: '쟁점 질문 1' }],
  commonCoverage: '공통 1\n공통 2',
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      articleCount: 3,
      frame: ' 노동권 ',
      keywords: '고용, 임금',
      representativeTitle: '대표 기사',
      representativeSource: '예시일보',
      representativeUrl: 'https://example.com/a',
    },
  ],
  opinionGroups: [{ id: 'group-a', label: '그룹 A', share: 55, description: ' 바뀐 설명 ' }],
  claims: [{ id: 'claim-1', title: ' 새 제목 ', description: ' 새 설명 ' }],
  ...overrides,
});

/** 폼이 항상 세 성향을 순서대로 제출한다는 사실을 그대로 흉내 낸다. */
const createMediaSlot = (
  leaning: MediaLeaning,
  overrides: Partial<MediaPerspectiveInput> = {},
): MediaPerspectiveInput => ({
  leaning,
  articleCount: 2,
  frame: `${leaning} 프레임`,
  keywords: '키워드',
  representativeTitle: '대표 기사',
  representativeSource: '예시일보',
  representativeUrl: 'https://example.com/a',
  ...overrides,
});

describe('parseTagList / parseLineList', () => {
  it('쉼표로 나누고 공백·빈 값을 버린다', () => {
    expect(parseTagList('노동, 고용 , ,연금')).toEqual(['노동', '고용', '연금']);
    expect(parseTagList('')).toEqual([]);
  });

  it('줄바꿈으로 나누고 빈 줄을 버린다', () => {
    expect(parseLineList('첫 줄\n\n  둘째 줄  ')).toEqual(['첫 줄', '둘째 줄']);
  });
});

describe('saveIssue', () => {
  it('폼 값을 정리해 저장하고 주장도 함께 저장한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await saveIssue(store, createSaveInput());

    const issue = await store.getIssue('issue-1');

    expect(issue?.question).toBe('정년을 연장해야 할까?');
    expect(issue?.tags).toEqual(['노동', '고용', '연금']);
    expect(issue?.summary).toEqual(['첫 문장', '둘째 문장']);
    expect(issue?.keyPoints).toEqual([{ id: 'key-point-1', title: '쟁점 1', question: '쟁점 질문 1' }]);
    expect(issue?.commonCoverage).toEqual(['공통 1', '공통 2']);
    expect(issue?.mediaPerspectives[0]).toMatchObject({
      leaning: MediaLeaning.PROGRESSIVE,
      frame: '노동권',
      keywords: ['고용', '임금'],
    });
    expect(issue?.claims[0]).toMatchObject({ title: '새 제목', description: '새 설명' });
  });

  it('의견 그룹은 편집하지 않는 관계 필드를 그대로 유지한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await saveIssue(store, createSaveInput());

    const group = (await store.getIssue('issue-1'))?.opinionGroups[0];

    expect(group).toMatchObject({
      share: 55,
      description: '바뀐 설명',
      agreesWith: ['claim-1'],
      disagreesWith: ['claim-2'],
      mostDivided: ['claim-3'],
    });
  });

  it('PROGRESSIVE 슬롯을 비운 뒤 저장하면 남은 성향에 중복이 생기지 않는다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await saveIssue(
      store,
      createSaveInput({
        mediaPerspectives: [
          createMediaSlot(MediaLeaning.PROGRESSIVE, { frame: '  ', representativeTitle: '' }),
          createMediaSlot(MediaLeaning.CENTRIST),
          createMediaSlot(MediaLeaning.CONSERVATIVE),
        ],
      }),
    );

    const leanings = (await store.getIssue('issue-1'))?.mediaPerspectives.map(
      (perspective) => perspective.leaning,
    );

    expect(leanings).toEqual([MediaLeaning.CENTRIST, MediaLeaning.CONSERVATIVE]);
    expect(new Set(leanings).size).toBe(leanings?.length);
  });

  it('같은 성향이 겹쳐 오면 첫 칸만 남긴다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await saveIssue(
      store,
      createSaveInput({
        mediaPerspectives: [
          createMediaSlot(MediaLeaning.CONSERVATIVE, { frame: '먼저' }),
          createMediaSlot(MediaLeaning.CONSERVATIVE, { frame: '나중' }),
        ],
      }),
    );

    expect((await store.getIssue('issue-1'))?.mediaPerspectives).toMatchObject([
      { leaning: MediaLeaning.CONSERVATIVE, frame: '먼저' },
    ]);
  });

  it('대표 기사 URL 이 http·https 가 아니면 저장하지 않는다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await expect(
      saveIssue(
        store,
        createSaveInput({
          mediaPerspectives: [
            createMediaSlot(MediaLeaning.PROGRESSIVE, {
              representativeUrl: 'javascript:alert(1)',
            }),
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: AdminMessage.ERROR_INVALID_URL });
    expect((await store.getIssue('issue-1'))?.question).toBe('정년을 연장해야 할까?');
  });

  it('의견 그룹은 id 로 짝지어 관계 필드를 잃지 않는다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await saveIssue(
      store,
      createSaveInput({
        opinionGroups: [
          { id: 'group-b', label: '그룹 B', share: 10, description: '새 그룹' },
          { id: 'group-a', label: '그룹 A', share: 20, description: '기존 그룹' },
        ],
      }),
    );

    const groups = (await store.getIssue('issue-1'))?.opinionGroups;

    expect(groups?.find((group) => group.id === 'group-a')).toMatchObject({
      agreesWith: ['claim-1'],
    });
    expect(groups?.find((group) => group.id === 'group-b')?.agreesWith).toEqual([]);
  });

  it('질문이 비면 저장하지 않는다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await expect(saveIssue(store, createSaveInput({ question: '   ' }))).rejects.toMatchObject({
      code: AdminMessage.ERROR_EMPTY_QUESTION,
    });
  });

  it('없는 이슈면 오류를 던진다', async () => {
    const store = new InMemoryAdminStore();

    await expect(saveIssue(store, createSaveInput())).rejects.toBeInstanceOf(AdminActionError);
  });
});

describe('saveClaim', () => {
  it('주장 하나만 저장한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await saveClaim(store, { id: 'claim-1', title: ' 제목 ', description: ' 설명 ' });

    expect((await store.getIssue('issue-1'))?.claims[0]).toMatchObject({
      title: '제목',
      description: '설명',
    });
  });
});

describe('publishIssue', () => {
  it('질문에서 slug 를 만들어 승인한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    const slug = await publishIssue(store, 'issue-1');

    expect(slug).toBe('정년을-연장해야-할까');
    expect((await store.getIssue('issue-1'))?.status).toBe(IssueStatus.PUBLISHED);
  });

  it('slug 가 이미 쓰이면 -2 를 붙인다', async () => {
    const store = new InMemoryAdminStore({
      issues: [
        createIssue({
          id: 'issue-0',
          slug: '정년을-연장해야-할까',
          status: IssueStatus.PUBLISHED,
        }),
        createIssue(),
      ],
    });

    expect(await publishIssue(store, 'issue-1')).toBe('정년을-연장해야-할까-2');
  });

  it('검수 대기가 아닌 이슈는 승인하지 않는다', async () => {
    const store = new InMemoryAdminStore({
      issues: [createIssue({ status: IssueStatus.DRAFT })],
    });

    await expect(publishIssue(store, 'issue-1')).rejects.toMatchObject({
      code: AdminMessage.ERROR_NOT_REVIEWABLE,
    });
    expect((await store.getIssue('issue-1'))?.status).toBe(IssueStatus.DRAFT);
  });

  it('이미 slug 가 있으면 그대로 쓴다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue({ slug: '기존-슬러그' })] });

    expect(await publishIssue(store, 'issue-1')).toBe('기존-슬러그');
  });

  it('승인에 성공하면 공개 화면 경로를 다시 만들게 한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });
    const revalidated: PublicPageTarget[][] = [];

    await publishIssue(store, 'issue-1', {
      revalidatePublicPages: (targets) => revalidated.push(targets),
    });

    expect(revalidated).toHaveLength(1);
    expect(revalidated[0].map((target) => target.path)).toEqual([
      '/',
      '/discover',
      '/issues/[issueId]',
      '/issues/[issueId]/result',
      '/issues/[issueId]/claims/[claimId]',
    ]);
    expect(revalidated[0]).toEqual(PUBLIC_PAGE_TARGETS);
  });

  it('승인이 막히면 공개 화면을 다시 만들지 않는다', async () => {
    const store = new InMemoryAdminStore({
      issues: [createIssue({ status: IssueStatus.DRAFT })],
    });
    const revalidated: PublicPageTarget[][] = [];

    await expect(
      publishIssue(store, 'issue-1', {
        revalidatePublicPages: (targets) => revalidated.push(targets),
      }),
    ).rejects.toBeInstanceOf(AdminActionError);
    expect(revalidated).toHaveLength(0);
  });
});

describe('assertReviewable', () => {
  it('검수 대기 이슈는 통과시킨다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await expect(assertReviewable(store, 'issue-1')).resolves.toBeUndefined();
  });

  it('검수 대기가 아니면 저장 전에 막는다', async () => {
    const store = new InMemoryAdminStore({
      issues: [createIssue({ status: IssueStatus.PUBLISHED })],
    });

    await expect(assertReviewable(store, 'issue-1')).rejects.toMatchObject({
      code: AdminMessage.ERROR_NOT_REVIEWABLE,
    });
  });

  it('없는 이슈는 찾을 수 없다고 알린다', async () => {
    const store = new InMemoryAdminStore();

    await expect(assertReviewable(store, 'issue-1')).rejects.toMatchObject({
      code: AdminMessage.ERROR_NOT_FOUND,
    });
  });
});

describe('rejectIssue', () => {
  it('메모와 함께 반려한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await rejectIssue(store, 'issue-1', '  근거가 부족합니다.  ');

    const issue = await store.getIssue('issue-1');

    expect(issue?.status).toBe(IssueStatus.REJECTED);
    expect(issue?.reviewNote).toBe('근거가 부족합니다.');
  });

  it('메모가 비면 반려하지 않는다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });
    const revalidated: PublicPageTarget[][] = [];

    await expect(
      rejectIssue(store, 'issue-1', '  ', {
        revalidatePublicPages: (targets) => revalidated.push(targets),
      }),
    ).rejects.toMatchObject({
      code: AdminMessage.ERROR_EMPTY_NOTE,
    });
    expect((await store.getIssue('issue-1'))?.status).toBe(IssueStatus.REVIEW);
    expect(revalidated).toHaveLength(0);
  });

  it('반려에 성공하면 공개 화면 경로를 다시 만들게 한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });
    const revalidated: PublicPageTarget[][] = [];

    await rejectIssue(store, 'issue-1', '근거가 부족합니다.', {
      revalidatePublicPages: (targets) => revalidated.push(targets),
    });

    expect(revalidated).toEqual([PUBLIC_PAGE_TARGETS]);
  });
});

describe('addSearchQuery', () => {
  it('공백을 정리해 추가한다', async () => {
    const store = new InMemoryAdminStore();

    await addSearchQuery(store, '  정년 연장  ');

    expect((await store.listQueries())[0]?.keyword).toBe('정년 연장');
  });

  it('빈 키워드는 거부한다', async () => {
    const store = new InMemoryAdminStore();

    await expect(addSearchQuery(store, ' ')).rejects.toMatchObject({
      code: AdminMessage.ERROR_EMPTY_KEYWORD,
    });
  });
});

describe('savePublisher', () => {
  it('도메인을 정규화해 저장한다', async () => {
    const store = new InMemoryAdminStore();

    await savePublisher(store, {
      domain: ' https://www.Example.com/news ',
      name: ' 예시일보 ',
      leaning: MediaLeaning.CONSERVATIVE,
    });

    expect((await store.listPublishers())[0]).toMatchObject({
      domain: 'example.com',
      name: '예시일보',
      leaning: MediaLeaning.CONSERVATIVE,
    });
  });

  it('쿼리스트링이 붙은 도메인도 호스트만 남긴다', async () => {
    const store = new InMemoryAdminStore();

    await savePublisher(store, { domain: 'www.x.com?from=nx', name: '엑스', leaning: null });

    expect((await store.listPublishers())[0]?.domain).toBe('x.com');
  });

  it('스킴이 http·https 가 아니면 거부한다', async () => {
    const store = new InMemoryAdminStore();

    await expect(
      savePublisher(store, { domain: 'javascript://example.com', name: '이름', leaning: null }),
    ).rejects.toMatchObject({ code: AdminMessage.ERROR_INVALID_URL });
  });

  it('도메인이나 매체명이 비면 거부한다', async () => {
    const store = new InMemoryAdminStore();

    await expect(savePublisher(store, { domain: '', name: '이름', leaning: null })).rejects.toMatchObject(
      { code: AdminMessage.ERROR_EMPTY_PUBLISHER },
    );
  });
});

describe('근거 소유권 확인', () => {
  const createStore = () =>
    new InMemoryAdminStore({
      issues: [
        createIssue({
          claims: [
            {
              id: 'claim-1',
              side: ClaimSide.AGREE,
              order: 1,
              title: '찬성',
              description: '설명',
              evidences: [
                {
                  id: 'evidence-1',
                  type: EvidenceType.FACT,
                  source: '매체',
                  date: new Date('2026-01-01T00:00:00.000Z'),
                  summary: '요약',
                  url: 'https://example.com/1',
                },
              ],
            },
          ],
        }),
        createIssue({
          id: 'issue-2',
          claims: [
            {
              id: 'claim-2',
              side: ClaimSide.AGREE,
              order: 1,
              title: '찬성',
              description: '설명',
              evidences: [
                {
                  id: 'evidence-2',
                  type: EvidenceType.FACT,
                  source: '매체',
                  date: new Date('2026-01-01T00:00:00.000Z'),
                  summary: '요약',
                  url: 'https://example.com/2',
                },
              ],
            },
          ],
        }),
      ],
    });

  it('다른 이슈에 속한 근거는 타입을 바꾸지 못한다', async () => {
    const store = createStore();

    await expect(
      updateEvidenceType(store, 'issue-1', 'evidence-2', EvidenceType.RESEARCH),
    ).rejects.toMatchObject({ code: AdminMessage.ERROR_EVIDENCE_MISMATCH });
    expect((await store.getIssue('issue-2'))?.claims[0]?.evidences[0]?.type).toBe(EvidenceType.FACT);
  });

  it('다른 이슈에 속한 근거는 삭제하지 못한다', async () => {
    const store = createStore();

    await expect(deleteEvidence(store, 'issue-1', 'evidence-2')).rejects.toMatchObject({
      code: AdminMessage.ERROR_EVIDENCE_MISMATCH,
    });
    expect((await store.getIssue('issue-2'))?.claims[0]?.evidences).toHaveLength(1);
  });

  it('없는 근거는 찾을 수 없다고 알린다', async () => {
    const store = createStore();

    await expect(deleteEvidence(store, 'issue-1', 'evidence-x')).rejects.toMatchObject({
      code: AdminMessage.ERROR_NOT_FOUND,
    });
  });

  it('같은 이슈의 근거는 정상 처리한다', async () => {
    const store = createStore();

    await updateEvidenceType(store, 'issue-1', 'evidence-1', EvidenceType.RESEARCH);
    expect((await store.getIssue('issue-1'))?.claims[0]?.evidences[0]?.type).toBe(
      EvidenceType.RESEARCH,
    );

    await deleteEvidence(store, 'issue-1', 'evidence-1');
    expect((await store.getIssue('issue-1'))?.claims[0]?.evidences).toHaveLength(0);
  });
});
