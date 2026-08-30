import { cache } from 'react';

import type { SessionUser } from '@/domain/SessionUser';
import { createServerSupabaseClient } from '@/lib/supabase/createServerSupabaseClient';
import { logServerError } from '@/server/logServerError';

/**
 * Supabase `user_metadata` 에서 이름으로 쓸 값. 공급자마다 키가 다르다.
 * Google 은 `full_name`·`name`, 카카오는 `nickname`·`preferred_username`·`user_name` 을 준다.
 */
const NAME_KEYS = ['full_name', 'name', 'nickname', 'preferred_username', 'user_name'];

/** Supabase `user_metadata` 에서 아바타로 쓸 값. 카카오는 `profile_image` 를 준다. */
const AVATAR_KEYS = ['avatar_url', 'picture', 'profile_image'];

const readMetadataString = (
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): string | null => {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
};

/**
 * 현재 요청의 로그인 사용자. 서버 전용(`cookies()`)이다.
 * 환경 변수가 없거나 세션이 없으면 null 이며, 호출부는 비로그인으로 다룬다.
 *
 * 한 요청 안에서 여러 번 불려도 Supabase 왕복은 한 번만 하도록 React `cache()` 로 감싼다
 * (React 렌더 컨텍스트 밖에서는 그냥 매번 실행된다).
 * 근거: docs/AuthSpec.md 5장.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    const metadata = data.user.user_metadata as Record<string, unknown> | undefined;

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      name: readMetadataString(metadata, NAME_KEYS),
      avatarUrl: readMetadataString(metadata, AVATAR_KEYS),
    };
  } catch (error) {
    logServerError('getSessionUser 실패', error);

    return null;
  }
});
