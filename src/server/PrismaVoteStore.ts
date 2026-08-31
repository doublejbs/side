import {
  ClaimFeedback as PrismaClaimFeedback,
  IssueStatus,
  type Prisma,
  type PrismaClient,
  type VoteChoice as PrismaVoteChoice,
} from '@prisma/client';

import { parseIssueAxes } from '@/data/IssueJsonSchemas';
import {
  toDomainClaimFeedback,
  toDomainVoteChoice,
  toPrismaClaimFeedback,
  toPrismaVoteChoice,
} from '@/data/PrismaEnumMappers';
import type { VoteCounts } from '@/data/voteAggregation';
import type { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceKey } from '@/domain/voteChoiceKey';
import {
  MAX_MY_VOTE_EVENTS,
  type ClaimedAnonRecordCounts,
  type MyPersuadedClaimRow,
  type MyVoteAxesRow,
  type MyVoteEventRow,
  type MyVoteRow,
  type VoteStore,
} from '@/server/VoteStore';

/** 유니크 제약 위반(Prisma). 같은 사용자의 첫 투표가 동시에 들어오면 upsert 가 이 오류로 실패한다. */
const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === UNIQUE_CONSTRAINT_ERROR_CODE;

/** 익명 레코드를 계정으로 옮길 때 쓰는 분류 결과. */
interface AnonRecordSplit<Row> {
  movable: Row[];
  conflicting: Row[];
}

/**
 * 익명 레코드를 이미 계정 레코드가 있는 것(충돌 → 삭제)과 없는 것(이전)으로 가른다.
 * 근거: docs/AuthSpec.md 4.3 — 계정 표가 익명 표보다 우선한다.
 */
const splitAnonRecords = <Row extends { id: string }>(
  anonRows: Row[],
  ownedKeys: Set<string>,
  toKey: (row: Row) => string,
): AnonRecordSplit<Row> => ({
  movable: anonRows.filter((row) => !ownedKeys.has(toKey(row))),
  conflicting: anonRows.filter((row) => ownedKeys.has(toKey(row))),
});

/** Prisma 로 투표·근거 피드백을 읽고 쓴다. enum 변환은 `PrismaEnumMappers` 가 맡는다. */
export class PrismaVoteStore implements VoteStore {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getIssueIdBySlug(slug: string): Promise<string | null> {
    const row = await this.prisma.issue.findFirst({
      where: { slug, status: IssueStatus.PUBLISHED },
      select: { id: true },
    });

    return row?.id ?? null;
  }

  async castVote(issueId: string, userId: string, choice: VoteChoice): Promise<void> {
    const prismaChoice = toPrismaVoteChoice(choice);

    try {
      await this.prisma.$transaction((tx: Prisma.TransactionClient) =>
        this.writeVote(tx, issueId, userId, prismaChoice, (client) =>
          client.vote.upsert({
            where: { issueId_userId: { issueId, userId } },
            create: { issueId, userId, choice: prismaChoice },
            update: { choice: prismaChoice },
          }),
        ),
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      // 다른 요청이 같은 행을 먼저 만든 경우다. 이미 행이 있으므로 갱신으로 한 번만 다시 시도한다.
      await this.prisma.$transaction((tx: Prisma.TransactionClient) =>
        this.writeVote(tx, issueId, userId, prismaChoice, (client) =>
          client.vote.update({
            where: { issueId_userId: { issueId, userId } },
            data: { choice: prismaChoice },
          }),
        ),
      );
    }
  }

  /**
   * 표를 쓰고, 신규이거나 선택이 바뀐 경우에만 이력을 남긴다.
   * 표와 이력이 함께 남도록 한 트랜잭션 안에서 돌린다. 근거: docs/PerspectiveSpec.md 2장.
   */
  private async writeVote(
    tx: Prisma.TransactionClient,
    issueId: string,
    userId: string,
    choice: PrismaVoteChoice,
    write: (client: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<void> {
    const existing = await tx.vote.findUnique({
      where: { issueId_userId: { issueId, userId } },
      select: { choice: true },
    });

    await write(tx);

    if (existing?.choice === choice) {
      return;
    }

    await tx.voteEvent.create({ data: { issueId, userId, choice } });
  }

  async getMyVote(issueId: string, userId: string): Promise<VoteChoice | null> {
    const row = await this.prisma.vote.findUnique({
      where: { issueId_userId: { issueId, userId } },
      select: { choice: true },
    });

    return row ? toDomainVoteChoice(row.choice) : null;
  }

  async countVotes(issueId: string): Promise<VoteCounts> {
    // 조건을 issueId 로만 두어 계정 표와 아직 이전되지 않은 익명 표를 모두 센다(docs/AuthSpec.md 3장).
    const groups = await this.prisma.vote.groupBy({
      by: ['choice'],
      where: { issueId },
      _count: { _all: true },
    });
    const counts: VoteCounts = { agree: 0, disagree: 0, unsure: 0 };

    groups.forEach((group) => {
      counts[getVoteChoiceKey(toDomainVoteChoice(group.choice))] = group._count._all;
    });

    return counts;
  }

  async listMyVotes(userId: string): Promise<MyVoteRow[]> {
    const rows = await this.prisma.vote.findMany({
      // 아직 발행되지 않은 이슈의 표는 화면이 가리킬 수 없으므로 애초에 빼고 읽는다.
      where: { userId, issue: { status: IssueStatus.PUBLISHED } },
      include: { issue: { select: { slug: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => ({
      issueSlug: row.issue.slug,
      choice: toDomainVoteChoice(row.choice),
      votedAt: row.updatedAt.toISOString(),
    }));
  }

  async listMyVoteEvents(userId: string): Promise<MyVoteEventRow[]> {
    const rows = await this.prisma.voteEvent.findMany({
      // 화면이 가리킬 수 없는 미발행 이슈의 이력은 애초에 빼고 읽는다.
      where: { userId, issue: { status: IssueStatus.PUBLISHED } },
      select: {
        issueId: true,
        choice: true,
        createdAt: true,
        issue: { select: { slug: true, question: true } },
      },
      // 최근 이력부터 상한만큼 읽고, 짝짓기는 오래된 순이 편하므로 뒤집어 돌려준다.
      orderBy: { createdAt: 'desc' },
      take: MAX_MY_VOTE_EVENTS,
    });

    return rows.reverse().map((row) => ({
      issueId: row.issueId,
      issueSlug: row.issue.slug,
      question: row.issue.question,
      choice: toDomainVoteChoice(row.choice),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async listMyPersuadedClaims(userId: string): Promise<MyPersuadedClaimRow[]> {
    const rows = await this.prisma.claimFeedbackRecord.findMany({
      where: { userId, feedback: PrismaClaimFeedback.PERSUADED },
      select: { claim: { select: { issueId: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({ issueId: row.claim.issueId, claimTitle: row.claim.title }));
  }

  async countMyClaimFeedbacks(userId: string): Promise<number> {
    return this.prisma.claimFeedbackRecord.count({ where: { userId } });
  }

  async listMyVoteAxes(userId: string): Promise<MyVoteAxesRow[]> {
    const rows = await this.prisma.vote.findMany({
      where: { userId, issue: { status: IssueStatus.PUBLISHED } },
      select: { choice: true, issue: { select: { axes: true } } },
    });

    return rows.map((row) => ({
      axes: parseIssueAxes(row.issue.axes),
      choice: toDomainVoteChoice(row.choice),
    }));
  }

  async setClaimFeedback(
    claimId: string,
    userId: string,
    feedback: ClaimFeedback | null,
  ): Promise<void> {
    if (feedback === null) {
      await this.prisma.claimFeedbackRecord.deleteMany({ where: { claimId, userId } });

      return;
    }

    await this.prisma.claimFeedbackRecord.upsert({
      where: { claimId_userId: { claimId, userId } },
      create: { claimId, userId, feedback: toPrismaClaimFeedback(feedback) },
      update: { feedback: toPrismaClaimFeedback(feedback) },
    });
  }

  async getMyClaimFeedback(claimId: string, userId: string): Promise<ClaimFeedback | null> {
    const row = await this.prisma.claimFeedbackRecord.findUnique({
      where: { claimId_userId: { claimId, userId } },
      select: { feedback: true },
    });

    return row ? toDomainClaimFeedback(row.feedback) : null;
  }

  async claimExists(claimId: string): Promise<boolean> {
    const row = await this.prisma.claim.findUnique({ where: { id: claimId }, select: { id: true } });

    return row !== null;
  }

  async claimAnonRecords(anonId: string, userId: string): Promise<ClaimedAnonRecordCounts> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const [anonVotes, ownedVotes] = await Promise.all([
        tx.vote.findMany({ where: { anonId }, select: { id: true, issueId: true } }),
        tx.vote.findMany({ where: { userId }, select: { issueId: true } }),
      ]);
      const votes = splitAnonRecords(
        anonVotes,
        new Set(ownedVotes.map((row) => row.issueId)),
        (row) => row.issueId,
      );

      const [anonFeedbacks, ownedFeedbacks] = await Promise.all([
        tx.claimFeedbackRecord.findMany({ where: { anonId }, select: { id: true, claimId: true } }),
        tx.claimFeedbackRecord.findMany({ where: { userId }, select: { claimId: true } }),
      ]);
      const feedbacks = splitAnonRecords(
        anonFeedbacks,
        new Set(ownedFeedbacks.map((row) => row.claimId)),
        (row) => row.claimId,
      );

      if (votes.conflicting.length > 0) {
        await tx.vote.deleteMany({ where: { id: { in: votes.conflicting.map((row) => row.id) } } });
      }

      if (votes.movable.length > 0) {
        await tx.vote.updateMany({
          where: { id: { in: votes.movable.map((row) => row.id) } },
          data: { userId, anonId: null },
        });
      }

      if (feedbacks.conflicting.length > 0) {
        await tx.claimFeedbackRecord.deleteMany({
          where: { id: { in: feedbacks.conflicting.map((row) => row.id) } },
        });
      }

      if (feedbacks.movable.length > 0) {
        await tx.claimFeedbackRecord.updateMany({
          where: { id: { in: feedbacks.movable.map((row) => row.id) } },
          data: { userId, anonId: null },
        });
      }

      return { votes: votes.movable.length, feedbacks: feedbacks.movable.length };
    });
  }
}
