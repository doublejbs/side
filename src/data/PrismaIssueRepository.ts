import { ClaimFeedback, IssueStatus, type PrismaClient } from '@prisma/client';

import { mapIssueRow } from '@/data/IssueMapper';
import type { IssueRow } from '@/data/IssueMapper';
import type { ClaimRouteParams, IssueRepository } from '@/data/IssueRepository';
import { toDomainVoteChoice } from '@/data/PrismaEnumMappers';
import { aggregateVotes } from '@/data/voteAggregation';
import type { VoteCounts } from '@/data/voteAggregation';
import type { Claim, Issue } from '@/domain/Issue';
import { getVoteChoiceKey } from '@/domain/voteChoiceKey';

/**
 * `IssueRow` 가 필요로 하는 컬럼만 고른다. 임베딩·centroid 같은 큰 컬럼은 읽지 않는다.
 * 피드백·기사 본문은 행을 읽지 않고 개수만 센다(`ClaimFeedback` 은 Prisma 가 만든 enum 이다).
 */
const ISSUE_SELECT = {
  id: true,
  slug: true,
  question: true,
  tags: true,
  axes: true,
  summary: true,
  keyPoints: true,
  commonCoverage: true,
  mediaPerspectives: true,
  opinionGroups: true,
  claims: {
    select: {
      id: true,
      side: true,
      order: true,
      title: true,
      description: true,
      evidences: {
        select: {
          id: true,
          type: true,
          source: true,
          date: true,
          summary: true,
          url: true,
          support: true,
        },
        orderBy: { date: 'desc' },
      },
      _count: { select: { feedbacks: { where: { feedback: ClaimFeedback.PERSUADED } } } },
    },
  },
  _count: { select: { articles: true } },
} as const;

const createEmptyCounts = (): VoteCounts => ({ agree: 0, disagree: 0, unsure: 0 });

/** Prisma 로 발행된 이슈를 읽는다. 분포·참여자 수는 `Vote` 테이블 집계로 만든다. */
export class PrismaIssueRepository implements IssueRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listPublishedIssues(): Promise<Issue[]> {
    const rows = await this.prisma.issue.findMany({
      where: { status: IssueStatus.PUBLISHED, slug: { not: null } },
      orderBy: { publishedAt: 'desc' },
      select: ISSUE_SELECT,
    });
    const issueIds = rows.map((row) => row.id);
    const [countsByIssueId, outletCountByIssueId] = await Promise.all([
      this.countVotes(issueIds),
      this.countMediaOutlets(issueIds),
    ]);

    return rows.map((row) => this.toIssue(row, countsByIssueId, outletCountByIssueId));
  }

  async getIssueBySlug(slug: string): Promise<Issue | null> {
    const row = await this.prisma.issue.findFirst({
      where: { slug, status: IssueStatus.PUBLISHED },
      select: ISSUE_SELECT,
    });

    if (!row) {
      return null;
    }

    const [countsByIssueId, outletCountByIssueId] = await Promise.all([
      this.countVotes([row.id]),
      this.countMediaOutlets([row.id]),
    ]);

    return this.toIssue(row, countsByIssueId, outletCountByIssueId);
  }

  async getClaimById(slug: string, claimId: string): Promise<Claim | null> {
    const issue = await this.getIssueBySlug(slug);

    return issue?.claims.find((claim) => claim.id === claimId) ?? null;
  }

  async listSlugs(): Promise<string[]> {
    try {
      const rows = await this.prisma.issue.findMany({
        where: { status: IssueStatus.PUBLISHED, slug: { not: null } },
        select: { slug: true },
      });

      return rows.flatMap((row) => (row.slug ? [row.slug] : []));
    } catch {
      // 빌드 시점에 DB 에 연결할 수 없으면 정적 경로를 만들지 않고 요청 시 렌더한다.
      return [];
    }
  }

  async listClaimParams(): Promise<ClaimRouteParams[]> {
    try {
      const rows = await this.prisma.claim.findMany({
        where: { issue: { status: IssueStatus.PUBLISHED, slug: { not: null } } },
        select: { id: true, issue: { select: { slug: true } } },
      });

      return rows.flatMap((row) =>
        row.issue.slug ? [{ slug: row.issue.slug, claimId: row.id }] : [],
      );
    } catch {
      return [];
    }
  }

  private async countVotes(issueIds: string[]): Promise<Map<string, VoteCounts>> {
    const countsByIssueId = new Map<string, VoteCounts>();

    if (issueIds.length === 0) {
      return countsByIssueId;
    }

    const groups = await this.prisma.vote.groupBy({
      by: ['issueId', 'choice'],
      where: { issueId: { in: issueIds } },
      _count: { _all: true },
    });

    groups.forEach((group) => {
      const counts = countsByIssueId.get(group.issueId) ?? createEmptyCounts();

      counts[getVoteChoiceKey(toDomainVoteChoice(group.choice))] = group._count._all;
      countsByIssueId.set(group.issueId, counts);
    });

    return countsByIssueId;
  }

  /** 매체 수만 필요하므로 기사 전량 대신 (이슈, 매체) 조합만 한 번에 읽는다. */
  private async countMediaOutlets(issueIds: string[]): Promise<Map<string, number>> {
    const countByIssueId = new Map<string, number>();

    if (issueIds.length === 0) {
      return countByIssueId;
    }

    const rows = await this.prisma.article.findMany({
      where: { issueId: { in: issueIds }, publisher: { not: null } },
      select: { issueId: true, publisher: true },
      distinct: ['issueId', 'publisher'],
    });

    rows.forEach((row) => {
      if (!row.issueId) {
        return;
      }

      countByIssueId.set(row.issueId, (countByIssueId.get(row.issueId) ?? 0) + 1);
    });

    return countByIssueId;
  }

  private toIssue(
    row: IssueRow,
    countsByIssueId: Map<string, VoteCounts>,
    outletCountByIssueId: Map<string, number>,
  ): Issue {
    const { distribution, participantCount } = aggregateVotes(
      countsByIssueId.get(row.id) ?? createEmptyCounts(),
    );

    return mapIssueRow(row, {
      distribution,
      participantCount,
      mediaOutletCount: outletCountByIssueId.get(row.id) ?? 0,
    });
  }
}
