import { IssueStatus } from '@/domain/IssueStatus';
import { computeCentroid } from '@/pipeline/computeCentroid';
import {
  MERGE_TARGET_WINDOW_DAYS,
  RESTORED_DEBATE_SCORE,
  type AdminClaimPatch,
  type AdminClaimPatchEntry,
  type AdminEvidencePatch,
  type AdminIssueDetail,
  type AdminIssueListItem,
  type AdminIssuePatch,
  type AdminMergeTarget,
  type AdminPublisher,
  type AdminPublisherInput,
  type AdminSearchQuery,
  type AdminStore,
} from '@/server/AdminStore';
import {
  appendReviewNote,
  mergedSourceNote,
  mergedTargetNote,
} from '@/server/mergeReviewNotes';

export interface InMemoryAdminData {
  issues?: AdminIssueDetail[];
  queries?: AdminSearchQuery[];
  publishers?: AdminPublisher[];
}

const clone = <T>(value: T): T => structuredClone(value);

const DAY_MS = 24 * 60 * 60 * 1000;

/** 병합 대상으로 고를 수 있는 상태. Prisma 구현과 같은 목록으로 판단한다. */
const MERGE_TARGET_STATUSES: IssueStatus[] = [
  IssueStatus.DRAFT,
  IssueStatus.REVIEW,
  IssueStatus.PUBLISHED,
];

/**
 * 테스트와 목 모드(DB 미연결)에서 쓰는 인메모리 구현.
 * 초기 데이터를 주입할 수 있고, 반환값은 항상 복사본이라 외부에서 상태를 바꿀 수 없다.
 */
export class InMemoryAdminStore implements AdminStore {
  private issues: AdminIssueDetail[];

  private queries: AdminSearchQuery[];

  private publishers: AdminPublisher[];

  private sequence = 0;

  constructor(data: InMemoryAdminData = {}) {
    this.issues = clone(data.issues ?? []);
    this.queries = clone(data.queries ?? []);
    this.publishers = clone(data.publishers ?? []);
  }

  private nextId(prefix: string): string {
    this.sequence += 1;

    return `${prefix}-${this.sequence}`;
  }

  private findIssue(id: string): AdminIssueDetail | undefined {
    return this.issues.find((issue) => issue.id === id);
  }

  async listIssues(status: IssueStatus): Promise<AdminIssueListItem[]> {
    return this.issues
      .filter((issue) => issue.status === status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((issue) => ({
        id: issue.id,
        question: issue.question,
        articleCount: issue.articles.length,
        claimCount: issue.claims.length,
        createdAt: new Date(issue.createdAt),
        hasWarning: issue.status !== IssueStatus.REJECTED && Boolean(issue.reviewNote),
        debateScore: issue.debateScore,
        topic: issue.topic,
        hasDuplicateWarning: Boolean(issue.classification?.duplicateOfIssueId),
      }));
  }

  async getIssue(id: string): Promise<AdminIssueDetail | null> {
    const issue = this.findIssue(id);

    return issue ? clone(issue) : null;
  }

  async updateIssue(id: string, patch: AdminIssuePatch): Promise<void> {
    const issue = this.findIssue(id);

    if (!issue) {
      return;
    }

    Object.assign(issue, clone(patch));
  }

  async updateClaim(claimId: string, patch: AdminClaimPatch): Promise<void> {
    for (const issue of this.issues) {
      const claim = issue.claims.find((candidate) => candidate.id === claimId);

      if (claim) {
        Object.assign(claim, patch);

        return;
      }
    }
  }

  /** 인메모리 구현에는 트랜잭션이 없으므로 순차 처리한다. */
  async saveIssueWithClaims(
    id: string,
    patch: AdminIssuePatch,
    claimPatches: AdminClaimPatchEntry[],
  ): Promise<void> {
    await this.updateIssue(id, patch);

    for (const entry of claimPatches) {
      await this.updateClaim(entry.id, entry.patch);
    }
  }

  async updateEvidence(evidenceId: string, patch: AdminEvidencePatch): Promise<void> {
    for (const issue of this.issues) {
      for (const claim of issue.claims) {
        const evidence = claim.evidences.find((candidate) => candidate.id === evidenceId);

        if (evidence) {
          evidence.type = patch.type;

          return;
        }
      }
    }
  }

  async deleteEvidence(evidenceId: string): Promise<void> {
    for (const issue of this.issues) {
      for (const claim of issue.claims) {
        claim.evidences = claim.evidences.filter((evidence) => evidence.id !== evidenceId);
      }
    }
  }

  async getEvidenceIssueId(evidenceId: string): Promise<string | null> {
    for (const issue of this.issues) {
      for (const claim of issue.claims) {
        if (claim.evidences.some((evidence) => evidence.id === evidenceId)) {
          return issue.id;
        }
      }
    }

    return null;
  }

  async publishIssue(id: string, slug: string): Promise<void> {
    const issue = this.findIssue(id);

    if (!issue) {
      return;
    }

    issue.status = IssueStatus.PUBLISHED;
    issue.slug = slug;
    issue.publishedAt = new Date();
    issue.reviewNote = null;
  }

  async rejectIssue(id: string, note: string): Promise<void> {
    const issue = this.findIssue(id);

    if (!issue) {
      return;
    }

    issue.status = IssueStatus.REJECTED;
    issue.reviewNote = note;
  }

  /** 복원은 상태와 점수만 바꾼다. 검수 메모와 분류 시각은 판단 근거로 남긴다. */
  async restoreIssue(id: string): Promise<void> {
    const issue = this.findIssue(id);

    if (!issue) {
      return;
    }

    issue.status = IssueStatus.DRAFT;
    issue.debateScore = RESTORED_DEBATE_SCORE;
  }

  /** 연결 기사 임베딩 평균으로 centroid 를 다시 쓴다. 쓸 임베딩이 없으면 그대로 둔다. */
  async recomputeCentroid(issueId: string): Promise<void> {
    const issue = this.findIssue(issueId);

    if (!issue) {
      return;
    }

    const centroid = computeCentroid(
      issue.articles.map((article) => article.embedding ?? []),
    );

    if (centroid.length === 0) {
      return;
    }

    issue.centroid = centroid;
  }

  async hasCentroid(issueId: string): Promise<boolean> {
    return (this.findIssue(issueId)?.centroid?.length ?? 0) > 0;
  }

  /** 인메모리 구현에는 트랜잭션이 없으므로 순차 처리한다. 반영 순서는 Prisma 구현과 같다. */
  async mergeIssue(sourceId: string, targetId: string): Promise<{ movedArticles: number }> {
    const source = this.findIssue(sourceId);
    const target = this.findIssue(targetId);

    if (!source || !target) {
      return { movedArticles: 0 };
    }

    const movedArticles = source.articles.length;

    target.articles = [...target.articles, ...source.articles];
    source.articles = [];
    source.status = IssueStatus.REJECTED;
    source.reviewNote = appendReviewNote(source.reviewNote, mergedSourceNote(target.question));
    target.reviewNote = appendReviewNote(
      target.reviewNote,
      mergedTargetNote(source.question, movedArticles),
    );

    await this.recomputeCentroid(target.id);

    return { movedArticles };
  }

  async listMergeTargets(excludeIssueId: string): Promise<AdminMergeTarget[]> {
    const since = new Date(Date.now() - MERGE_TARGET_WINDOW_DAYS * DAY_MS);

    return this.issues
      .filter(
        (issue) =>
          issue.id !== excludeIssueId &&
          MERGE_TARGET_STATUSES.includes(issue.status) &&
          issue.createdAt >= since,
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((issue) => ({ id: issue.id, question: issue.question, status: issue.status }));
  }

  async listQueries(): Promise<AdminSearchQuery[]> {
    return clone(
      [...this.queries].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    );
  }

  async createQuery(keyword: string): Promise<void> {
    const existing = this.queries.find((query) => query.keyword === keyword);

    if (existing) {
      existing.isActive = true;

      return;
    }

    this.queries.push({
      id: this.nextId('query'),
      keyword,
      isActive: true,
      createdAt: new Date(),
    });
  }

  async setQueryActive(id: string, isActive: boolean): Promise<void> {
    const query = this.queries.find((candidate) => candidate.id === id);

    if (query) {
      query.isActive = isActive;
    }
  }

  async listPublishers(): Promise<AdminPublisher[]> {
    return clone([...this.publishers].sort((left, right) => left.domain.localeCompare(right.domain)));
  }

  async upsertPublisher(input: AdminPublisherInput): Promise<void> {
    const existing = this.publishers.find((publisher) => publisher.domain === input.domain);

    if (existing) {
      existing.name = input.name;
      existing.leaning = input.leaning;

      return;
    }

    this.publishers.push({ id: this.nextId('publisher'), ...input });
  }

  async deletePublisher(id: string): Promise<void> {
    this.publishers = this.publishers.filter((publisher) => publisher.id !== id);
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    return this.issues.some((issue) => issue.slug === slug);
  }
}
