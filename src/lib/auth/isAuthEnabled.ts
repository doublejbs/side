import { getSupabaseEnv } from '@/lib/supabase/getSupabaseEnv';

/**
 * 로그인 기능을 켤 수 있는지. Supabase 공개 환경 변수가 둘 다 있어야 한다.
 * 서버·클라이언트 어디서든 같은 판정을 쓰도록 이 함수 하나만 본다.
 */
export const isAuthEnabled = (): boolean => getSupabaseEnv() !== null;
