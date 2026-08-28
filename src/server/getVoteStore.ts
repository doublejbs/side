import { getPrismaClient } from '@/data/PrismaClient';
import { PrismaVoteStore } from '@/server/PrismaVoteStore';
import type { VoteStore } from '@/server/VoteStore';

let store: VoteStore | null = null;

/**
 * `DATABASE_URL` 이 있을 때만 서버 투표 저장소를 돌려준다.
 * 목 데이터 모드에서는 null 이고, 호출부는 쓰기 API 를 503 으로 막는다.
 */
export const getVoteStore = (): VoteStore | null => {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  if (!store) {
    store = new PrismaVoteStore(prisma);
  }

  return store;
};
