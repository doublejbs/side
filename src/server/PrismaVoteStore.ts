import { IssueStatus, type PrismaClient } from '@prisma/client';

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
import type { VoteStore } from '@/server/VoteStore';

/** 유니크 제약 위반(Prisma). 같은 익명 식별자의 첫 투표가 동시에 들어오면 upsert 가 이 오류로 실패한다. */
const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === UNIQUE_CONSTRAINT_ERROR_CODE;

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

  async castVote(issueId: string, anonId: string, choice: VoteChoice): Promise<void> {
    try {
      await this.prisma.vote.upsert({
        where: { issueId_anonId: { issueId, anonId } },
        create: { issueId, anonId, choice: toPrismaVoteChoice(choice) },
        update: { choice: toPrismaVoteChoice(choice) },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      // 다른 요청이 같은 행을 먼저 만든 경우다. 이미 행이 있으므로 갱신으로 한 번만 다시 시도한다.
      await this.prisma.vote.update({
        where: { issueId_anonId: { issueId, anonId } },
        data: { choice: toPrismaVoteChoice(choice) },
      });
    }
  }

  async getMyVote(issueId: string, anonId: string): Promise<VoteChoice | null> {
    const row = await this.prisma.vote.findUnique({
      where: { issueId_anonId: { issueId, anonId } },
      select: { choice: true },
    });

    return row ? toDomainVoteChoice(row.choice) : null;
  }

  async countVotes(issueId: string): Promise<VoteCounts> {
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

  async setClaimFeedback(
    claimId: string,
    anonId: string,
    feedback: ClaimFeedback | null,
  ): Promise<void> {
    if (feedback === null) {
      await this.prisma.claimFeedbackRecord.deleteMany({ where: { claimId, anonId } });

      return;
    }

    await this.prisma.claimFeedbackRecord.upsert({
      where: { claimId_anonId: { claimId, anonId } },
      create: { claimId, anonId, feedback: toPrismaClaimFeedback(feedback) },
      update: { feedback: toPrismaClaimFeedback(feedback) },
    });
  }

  async getMyClaimFeedback(claimId: string, anonId: string): Promise<ClaimFeedback | null> {
    const row = await this.prisma.claimFeedbackRecord.findUnique({
      where: { claimId_anonId: { claimId, anonId } },
      select: { feedback: true },
    });

    return row ? toDomainClaimFeedback(row.feedback) : null;
  }

  async claimExists(claimId: string): Promise<boolean> {
    const row = await this.prisma.claim.findUnique({ where: { id: claimId }, select: { id: true } });

    return row !== null;
  }
}
