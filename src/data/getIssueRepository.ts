import type { IssueRepository } from '@/data/IssueRepository';
import { MockIssueRepository } from '@/data/MockIssueRepository';
import { getPrismaClient } from '@/data/PrismaClient';
import { PrismaIssueRepository } from '@/data/PrismaIssueRepository';

let repository: IssueRepository | null = null;

/**
 * `DATABASE_URL` 이 있으면 Prisma 구현을, 없으면 목 구현을 돌려준다.
 * 선택 결과는 모듈 수준에 캐시한다.
 */
export const getIssueRepository = (): IssueRepository => {
  if (!repository) {
    const prisma = getPrismaClient();

    repository = prisma ? new PrismaIssueRepository(prisma) : new MockIssueRepository();
  }

  return repository;
};
