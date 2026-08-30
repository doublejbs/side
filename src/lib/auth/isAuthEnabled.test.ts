import { afterEach, describe, expect, it, vi } from 'vitest';

import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isAuthEnabled', () => {
  it('두 환경 변수가 모두 있으면 켜진다', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ref.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    expect(isAuthEnabled()).toBe(true);
  });

  it('하나라도 비면 꺼진다', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ref.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    expect(isAuthEnabled()).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    expect(isAuthEnabled()).toBe(false);
  });
});
