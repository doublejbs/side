import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';
import type { AdminIssueDetail } from '@/server/AdminStore';

import { InMemoryAdminStore } from './InMemoryAdminStore';

const createIssue = (overrides: Partial<AdminIssueDetail> = {}): AdminIssueDetail => ({
  id: 'issue-1',
  status: IssueStatus.REVIEW,
  slug: null,
  question: '정년을 연장해야 할까?',
  tags: ['노동'],
  summary: ['문장 1'],
  keyPoints: [],
  commonCoverage: [],
  mediaPerspectives: [],
  opinionGroups: [],
  reviewNote: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  publishedAt: null,
  claims: [
    {
      id: 'claim-1',
      side: ClaimSide.AGREE,
      order: 1,
      title: '찬성 주장',
      description: '설명',
      evidences: [
        {
          id: 'evidence-1',
          type: EvidenceType.FACT,
          source: '매체',
          date: new Date('2026-01-01T00:00:00.000Z'),
          summary: '근거 요약',
          url: 'https://example.com/1',
        },
      ],
    },
  ],
  articles: [
    {
      id: 'article-1',
      title: '기사 제목',
      publisher: '매체',
      originalLink: 'https://example.com/article',
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  ...overrides,
});

describe('InMemoryAdminStore', () => {
  it('상태별로 목록을 만들고 기사·주장 수와 경고 여부를 계산한다', async () => {
    const store = new InMemoryAdminStore({
      issues: [
        createIssue(),
        createIssue({ id: 'issue-2', status: IssueStatus.DRAFT, reviewNote: '근거 부족' }),
      ],
    });

    const reviewList = await store.listIssues(IssueStatus.REVIEW);
    const draftList = await store.listIssues(IssueStatus.DRAFT);

    expect(reviewList).toHaveLength(1);
    expect(reviewList[0]).toMatchObject({ articleCount: 1, claimCount: 1, hasWarning: false });
    expect(draftList[0]?.hasWarning).toBe(true);
  });

  it('반려된 이슈의 검수 메모는 경고로 세지 않는다', async () => {
    const store = new InMemoryAdminStore({
      issues: [createIssue({ status: IssueStatus.REJECTED, reviewNote: '근거 부족' })],
    });

    expect((await store.listIssues(IssueStatus.REJECTED))[0]?.hasWarning).toBe(false);
  });

  it('반환한 이슈를 바꿔도 내부 상태는 변하지 않는다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });
    const issue = await store.getIssue('issue-1');

    if (issue) {
      issue.question = '바뀐 질문';
    }

    const reloaded = await store.getIssue('issue-1');

    expect(reloaded?.question).toBe('정년을 연장해야 할까?');
  });

  it('이슈와 주장을 수정한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await store.updateIssue('issue-1', { question: '새 질문', tags: ['노동', '고용'] });
    await store.updateClaim('claim-1', { title: '새 제목' });

    const issue = await store.getIssue('issue-1');

    expect(issue?.question).toBe('새 질문');
    expect(issue?.tags).toEqual(['노동', '고용']);
    expect(issue?.claims[0]?.title).toBe('새 제목');
  });

  it('근거 타입을 바꾸고 삭제한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await store.updateEvidence('evidence-1', { type: EvidenceType.RESEARCH });
    expect((await store.getIssue('issue-1'))?.claims[0]?.evidences[0]?.type).toBe(
      EvidenceType.RESEARCH,
    );

    await store.deleteEvidence('evidence-1');
    expect((await store.getIssue('issue-1'))?.claims[0]?.evidences).toHaveLength(0);
  });

  it('근거가 속한 이슈 id 를 찾는다', async () => {
    const store = new InMemoryAdminStore({
      issues: [createIssue(), createIssue({ id: 'issue-2', claims: [] })],
    });

    expect(await store.getEvidenceIssueId('evidence-1')).toBe('issue-1');
    expect(await store.getEvidenceIssueId('evidence-x')).toBeNull();
  });

  it('이슈와 주장을 한 번에 저장한다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await store.saveIssueWithClaims(
      'issue-1',
      { question: '한 번에 바꾼 질문' },
      [{ id: 'claim-1', patch: { title: '한 번에 바꾼 제목' } }],
    );

    const issue = await store.getIssue('issue-1');

    expect(issue?.question).toBe('한 번에 바꾼 질문');
    expect(issue?.claims[0]?.title).toBe('한 번에 바꾼 제목');
  });

  it('승인하면 상태·slug·발행일이 채워지고 경고가 사라진다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue({ reviewNote: '경고' })] });

    await store.publishIssue('issue-1', '정년-연장');

    const issue = await store.getIssue('issue-1');

    expect(issue?.status).toBe(IssueStatus.PUBLISHED);
    expect(issue?.slug).toBe('정년-연장');
    expect(issue?.publishedAt).not.toBeNull();
    expect(issue?.reviewNote).toBeNull();
    expect(await store.isSlugTaken('정년-연장')).toBe(true);
    expect(await store.isSlugTaken('다른-슬러그')).toBe(false);
  });

  it('반려하면 상태와 메모가 남는다', async () => {
    const store = new InMemoryAdminStore({ issues: [createIssue()] });

    await store.rejectIssue('issue-1', '근거가 부족합니다.');

    const issue = await store.getIssue('issue-1');

    expect(issue?.status).toBe(IssueStatus.REJECTED);
    expect(issue?.reviewNote).toBe('근거가 부족합니다.');
  });

  it('키워드를 추가하고 다시 추가하면 활성화만 바뀐다', async () => {
    const store = new InMemoryAdminStore();

    await store.createQuery('정년 연장');
    const [created] = await store.listQueries();

    await store.setQueryActive(created.id, false);
    expect((await store.listQueries())[0]?.isActive).toBe(false);

    await store.createQuery('정년 연장');
    const queries = await store.listQueries();

    expect(queries).toHaveLength(1);
    expect(queries[0]?.isActive).toBe(true);
  });

  it('매체를 도메인 기준으로 upsert 하고 삭제한다', async () => {
    const store = new InMemoryAdminStore();

    await store.upsertPublisher({ domain: 'example.com', name: '예시일보', leaning: null });
    await store.upsertPublisher({
      domain: 'example.com',
      name: '예시일보',
      leaning: MediaLeaning.CENTRIST,
    });

    const publishers = await store.listPublishers();

    expect(publishers).toHaveLength(1);
    expect(publishers[0]?.leaning).toBe(MediaLeaning.CENTRIST);

    await store.deletePublisher(publishers[0].id);
    expect(await store.listPublishers()).toHaveLength(0);
  });
});
