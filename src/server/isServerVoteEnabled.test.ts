import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPrismaClient } from '@/data/PrismaClient';
import { getServerVoteContext, isServerVoteEnabled } from '@/server/isServerVoteEnabled';

vi.mock('@/data/PrismaClient', () => ({ getPrismaClient: vi.fn() }));

const getPrismaClientMock = vi.mocked(getPrismaClient);

const FAKE_PRISMA = {} as ReturnType<typeof getPrismaClient>;

describe('isServerVoteEnabled', () => {
  beforeEach(() => {
    getPrismaClientMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('저장소와 쿠키 비밀키가 모두 있으면 켜진다', () => {
    getPrismaClientMock.mockReturnValue(FAKE_PRISMA);
    vi.stubEnv('ANON_COOKIE_SECRET', 'secret');

    expect(isServerVoteEnabled()).toBe(true);
    expect(getServerVoteContext()?.secret).toBe('secret');
  });

  it('DATABASE_URL 이 없어 저장소를 만들 수 없으면 꺼진다', () => {
    getPrismaClientMock.mockReturnValue(null);
    vi.stubEnv('ANON_COOKIE_SECRET', 'secret');

    expect(isServerVoteEnabled()).toBe(false);
    expect(getServerVoteContext()).toBeNull();
  });

  it('쿠키 비밀키가 없으면 저장소가 있어도 꺼진다', () => {
    getPrismaClientMock.mockReturnValue(FAKE_PRISMA);
    vi.stubEnv('ANON_COOKIE_SECRET', '');

    expect(isServerVoteEnabled()).toBe(false);
    expect(getServerVoteContext()).toBeNull();
  });
});
