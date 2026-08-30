import { getPrismaClient } from '@/data/PrismaClient';
import type { AdminStore } from '@/server/AdminStore';
import { InMemoryAdminStore } from '@/server/InMemoryAdminStore';
import { PrismaAdminStore } from '@/server/PrismaAdminStore';

let store: AdminStore | null = null;

/**
 * `DATABASE_URL` 이 있으면 Prisma 구현을, 없으면 빈 인메모리 구현을 돌려준다.
 * 목 모드에서는 화면이 비어 보이므로 `isAdminDatabaseConnected()` 로 안내를 띄운다.
 */
export const getAdminStore = (): AdminStore => {
  if (!store) {
    const prisma = getPrismaClient();

    store = prisma ? new PrismaAdminStore(prisma) : new InMemoryAdminStore();
  }

  return store;
};

/** 관리자 화면이 실데이터를 다루고 있는지. */
export const isAdminDatabaseConnected = (): boolean => getPrismaClient() !== null;
