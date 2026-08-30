/** Supabase 접속에 필요한 공개 환경 변수. 근거: docs/AuthSpec.md 2장. */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * 두 공개 환경 변수를 함께 읽는다. 하나라도 비어 있으면 인증을 켤 수 없으므로 null 이다.
 * `process.env.NEXT_PUBLIC_*` 는 Next 가 빌드 시 값으로 치환하므로 클라이언트에서도 읽을 수 있다.
 */
export const getSupabaseEnv = (): SupabaseEnv | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
};
