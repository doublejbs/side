import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createServerSupabaseClient } from '@/lib/supabase/createServerSupabaseClient';
import { getSessionUser } from '@/lib/supabase/getSessionUser';

vi.mock('@/lib/supabase/createServerSupabaseClient', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const createClientMock = vi.mocked(createServerSupabaseClient);

/** `supabase.auth.getUser()` 응답만 흉내 낸다. 나머지 API 는 쓰지 않는다. */
const stubClient = (user: Record<string, unknown> | null): void => {
  createClientMock.mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
};

beforeEach(() => {
  createClientMock.mockReset();
});

describe('getSessionUser', () => {
  it('환경 변수가 없으면 null 이다', async () => {
    createClientMock.mockResolvedValue(null);

    await expect(getSessionUser()).resolves.toBeNull();
  });

  it('세션이 없으면 null 이다', async () => {
    stubClient(null);

    await expect(getSessionUser()).resolves.toBeNull();
  });

  it('Google 형태 메타데이터에서 이름과 아바타를 뽑는다', async () => {
    stubClient({
      id: 'user-google',
      email: 'someone@example.com',
      user_metadata: {
        full_name: '홍길동',
        preferred_username: 'gildong',
        picture: 'https://lh3.googleusercontent.com/a/avatar',
      },
    });

    await expect(getSessionUser()).resolves.toEqual({
      id: 'user-google',
      email: 'someone@example.com',
      name: '홍길동',
      avatarUrl: 'https://lh3.googleusercontent.com/a/avatar',
    });
  });

  it('카카오 형태 메타데이터의 user_name·profile_image 도 읽는다', async () => {
    stubClient({
      id: 'user-kakao',
      email: null,
      user_metadata: {
        user_name: '카카오닉',
        profile_image: 'https://k.kakaocdn.net/img/profile.jpg',
      },
    });

    await expect(getSessionUser()).resolves.toEqual({
      id: 'user-kakao',
      email: null,
      name: '카카오닉',
      avatarUrl: 'https://k.kakaocdn.net/img/profile.jpg',
    });
  });

  it('preferred_username 만 있어도 이름으로 쓴다', async () => {
    stubClient({
      id: 'user-kakao-2',
      user_metadata: { preferred_username: '닉네임만' },
    });

    await expect(getSessionUser()).resolves.toEqual({
      id: 'user-kakao-2',
      email: null,
      name: '닉네임만',
      avatarUrl: null,
    });
  });

  it('메타데이터가 없으면 이름·아바타는 null 이다', async () => {
    stubClient({ id: 'user-bare', email: 'bare@example.com' });

    await expect(getSessionUser()).resolves.toEqual({
      id: 'user-bare',
      email: 'bare@example.com',
      name: null,
      avatarUrl: null,
    });
  });
});
