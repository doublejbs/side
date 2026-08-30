import { IssueStatus as PrismaIssueStatus, Prisma, type PrismaClient } from '@prisma/client';

import {
  issueClassificationSchema,
  keyPointsSchema,
  mediaPerspectivesSchema,
  opinionGroupsSchema,
} from '@/data/IssueJsonSchemas';
import {
  toDomainClaimSide,
  toDomainEvidenceSupport,
  toDomainEvidenceType,
  toDomainIssueStatus,
  toDomainMediaLeaning,
  toPrismaEvidenceType,
  toPrismaIssueStatus,
  toPrismaMediaLeaning,
} from '@/data/PrismaEnumMappers';
import type { EvidenceSupport } from '@/domain/EvidenceSupport';
import type { KeyPoint, MediaPerspective, OpinionGroup } from '@/domain/Issue';
import type { IssueClassification } from '@/domain/IssueClassification';
import { IssueStatus } from '@/domain/IssueStatus';
import {
  RESTORED_DEBATE_SCORE,
  type AdminClaimPatch,
  type AdminClaimPatchEntry,
  type AdminEvidencePatch,
  type AdminIssueDetail,
  type AdminIssueListItem,
  type AdminIssuePatch,
  type AdminPublisher,
  type AdminPublisherInput,
  type AdminSearchQuery,
  type AdminStore,
} from '@/server/AdminStore';

/** Json 컬럼은 검증에 실패하면 폼이 깨지지 않도록 빈 배열로 떨어뜨린다. */
const parseKeyPoints = (value: unknown): KeyPoint[] => {
  const parsed = keyPointsSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

const parseMediaPerspectives = (value: unknown): MediaPerspective[] => {
  const parsed = mediaPerspectivesSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

const parseOpinionGroups = (value: unknown): OpinionGroup[] => {
  const parsed = opinionGroupsSchema.safeParse(value);

  return parsed.success ? parsed.data : [];
};

/** 분류 Json 도 검증에 실패하면 화면이 깨지지 않도록 "아직 분류되지 않음"으로 떨어뜨린다. */
const parseClassification = (value: unknown): IssueClassification | null => {
  const parsed = issueClassificationSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
};

/** 아직 검증되지 않은 근거는 `support` 가 비어 있다. */
const parseEvidenceSupport = (value: string | null): EvidenceSupport | null =>
  value === null ? null : toDomainEvidenceSupport(value);

const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** 검수 폼은 기사 원문 링크를 최신순으로만 보여 준다. 전부 실어 오면 응답이 지나치게 커진다. */
const ARTICLE_TAKE = 200;

/** 넘기지 않은 필드는 건드리지 않도록 정의된 값만 골라 담는다. */
const toIssueUpdateData = (patch: AdminIssuePatch): Prisma.IssueUpdateInput => ({
  ...(patch.question === undefined ? {} : { question: patch.question }),
  ...(patch.tags === undefined ? {} : { tags: patch.tags }),
  ...(patch.summary === undefined ? {} : { summary: patch.summary }),
  ...(patch.keyPoints === undefined ? {} : { keyPoints: toJson(patch.keyPoints) }),
  ...(patch.commonCoverage === undefined ? {} : { commonCoverage: patch.commonCoverage }),
  ...(patch.mediaPerspectives === undefined
    ? {}
    : { mediaPerspectives: toJson(patch.mediaPerspectives) }),
  ...(patch.opinionGroups === undefined ? {} : { opinionGroups: toJson(patch.opinionGroups) }),
});

/** Prisma 로 관리자 검수 데이터를 읽고 쓴다. */
export class PrismaAdminStore implements AdminStore {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listIssues(status: IssueStatus): Promise<AdminIssueListItem[]> {
    const rows = await this.prisma.issue.findMany({
      where: { status: toPrismaIssueStatus(status) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        createdAt: true,
        reviewNote: true,
        debateScore: true,
        topic: true,
        classification: true,
        _count: { select: { articles: true, claims: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      question: row.question,
      articleCount: row._count.articles,
      claimCount: row._count.claims,
      createdAt: row.createdAt,
      hasWarning: status !== IssueStatus.REJECTED && Boolean(row.reviewNote),
      debateScore: row.debateScore,
      topic: row.topic,
      hasDuplicateWarning: Boolean(parseClassification(row.classification)?.duplicateOfIssueId),
    }));
  }

  async getIssue(id: string): Promise<AdminIssueDetail | null> {
    const row = await this.prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        slug: true,
        question: true,
        tags: true,
        summary: true,
        keyPoints: true,
        commonCoverage: true,
        mediaPerspectives: true,
        opinionGroups: true,
        reviewNote: true,
        classification: true,
        debateScore: true,
        topic: true,
        classifiedAt: true,
        verifiedAt: true,
        createdAt: true,
        publishedAt: true,
        claims: {
          orderBy: [{ side: 'asc' }, { order: 'asc' }],
          select: {
            id: true,
            side: true,
            order: true,
            title: true,
            description: true,
            evidences: {
              orderBy: { date: 'desc' },
              select: {
                id: true,
                type: true,
                source: true,
                date: true,
                summary: true,
                url: true,
                support: true,
                verificationNote: true,
              },
            },
          },
        },
        articles: {
          orderBy: { publishedAt: 'desc' },
          take: ARTICLE_TAKE,
          select: {
            id: true,
            title: true,
            publisher: true,
            originalLink: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      status: toDomainIssueStatus(row.status),
      slug: row.slug,
      question: row.question,
      tags: row.tags,
      summary: row.summary,
      keyPoints: parseKeyPoints(row.keyPoints),
      commonCoverage: row.commonCoverage,
      mediaPerspectives: parseMediaPerspectives(row.mediaPerspectives),
      opinionGroups: parseOpinionGroups(row.opinionGroups),
      reviewNote: row.reviewNote,
      classification: parseClassification(row.classification),
      debateScore: row.debateScore,
      topic: row.topic,
      classifiedAt: row.classifiedAt,
      verifiedAt: row.verifiedAt,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
      claims: row.claims.map((claim) => ({
        id: claim.id,
        side: toDomainClaimSide(claim.side),
        order: claim.order,
        title: claim.title,
        description: claim.description,
        evidences: claim.evidences.map((evidence) => ({
          id: evidence.id,
          type: toDomainEvidenceType(evidence.type),
          source: evidence.source,
          date: evidence.date,
          summary: evidence.summary,
          url: evidence.url,
          support: parseEvidenceSupport(evidence.support),
          verificationNote: evidence.verificationNote,
        })),
      })),
      articles: row.articles,
    };
  }

  async updateIssue(id: string, patch: AdminIssuePatch): Promise<void> {
    await this.prisma.issue.update({ where: { id }, data: toIssueUpdateData(patch) });
  }

  async updateClaim(claimId: string, patch: AdminClaimPatch): Promise<void> {
    await this.prisma.claim.update({ where: { id: claimId }, data: patch });
  }

  /** 이슈와 주장을 한 트랜잭션으로 저장해 절반만 반영되는 상태를 막는다. */
  async saveIssueWithClaims(
    id: string,
    patch: AdminIssuePatch,
    claimPatches: AdminClaimPatchEntry[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.issue.update({ where: { id }, data: toIssueUpdateData(patch) }),
      ...claimPatches.map((entry) =>
        this.prisma.claim.update({ where: { id: entry.id }, data: entry.patch }),
      ),
    ]);
  }

  async updateEvidence(evidenceId: string, patch: AdminEvidencePatch): Promise<void> {
    await this.prisma.evidence.update({
      where: { id: evidenceId },
      data: { type: toPrismaEvidenceType(patch.type) },
    });
  }

  async deleteEvidence(evidenceId: string): Promise<void> {
    await this.prisma.evidence.delete({ where: { id: evidenceId } });
  }

  async getEvidenceIssueId(evidenceId: string): Promise<string | null> {
    const row = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { claim: { select: { issueId: true } } },
    });

    return row?.claim.issueId ?? null;
  }

  async publishIssue(id: string, slug: string): Promise<void> {
    await this.prisma.issue.update({
      where: { id },
      data: {
        status: PrismaIssueStatus.PUBLISHED,
        slug,
        publishedAt: new Date(),
        reviewNote: null,
      },
    });
  }

  async rejectIssue(id: string, note: string): Promise<void> {
    await this.prisma.issue.update({
      where: { id },
      data: { status: PrismaIssueStatus.REJECTED, reviewNote: note },
    });
  }

  /**
   * 복원(관리자 승격). 상태만 되돌리고 `reviewNote`·`classifiedAt` 은 판단 근거로 남긴다.
   * 다음 실행에서 임계값과 무관하게 요약 대상이 되도록 점수를 상한값으로 올린다.
   */
  async restoreIssue(id: string): Promise<void> {
    await this.prisma.issue.update({
      where: { id },
      data: { status: PrismaIssueStatus.DRAFT, debateScore: RESTORED_DEBATE_SCORE },
    });
  }

  async listQueries(): Promise<AdminSearchQuery[]> {
    return this.prisma.searchQuery.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createQuery(keyword: string): Promise<void> {
    await this.prisma.searchQuery.upsert({
      where: { keyword },
      update: { isActive: true },
      create: { keyword },
    });
  }

  async setQueryActive(id: string, isActive: boolean): Promise<void> {
    await this.prisma.searchQuery.update({ where: { id }, data: { isActive } });
  }

  async listPublishers(): Promise<AdminPublisher[]> {
    const rows = await this.prisma.publisher.findMany({ orderBy: { domain: 'asc' } });

    return rows.map((row) => ({
      id: row.id,
      domain: row.domain,
      name: row.name,
      leaning: row.leaning ? toDomainMediaLeaning(row.leaning) : null,
    }));
  }

  async upsertPublisher(input: AdminPublisherInput): Promise<void> {
    const leaning = input.leaning ? toPrismaMediaLeaning(input.leaning) : null;

    await this.prisma.publisher.upsert({
      where: { domain: input.domain },
      update: { name: input.name, leaning },
      create: { domain: input.domain, name: input.name, leaning },
    });
  }

  async deletePublisher(id: string): Promise<void> {
    await this.prisma.publisher.delete({ where: { id } });
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const count = await this.prisma.issue.count({ where: { slug } });

    return count > 0;
  }
}
