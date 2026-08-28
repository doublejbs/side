import { PrismaClient } from '@prisma/client';

/** dev 서버 HMR 에서 커넥션이 계속 늘어나지 않도록 전역에 캐시한다. */
interface PrismaGlobal {
  sidePrismaClient?: PrismaClient | null;
}

const prismaGlobal = globalThis as unknown as PrismaGlobal;

/**
 * `DATABASE_URL` 이 있을 때만 Prisma 클라이언트를 만든다.
 * 없으면 목 데이터 모드이므로 `null` 을 돌려주고 클라이언트를 생성하지 않는다.
 */
export const getPrismaClient = (): PrismaClient | null => {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!prismaGlobal.sidePrismaClient) {
    prismaGlobal.sidePrismaClient = new PrismaClient();
  }

  return prismaGlobal.sidePrismaClient;
};
