/**
 * 로그인한 사용자. Supabase `auth.users` 를 앱 DB 에 복제하지 않으므로
 * 프로필 표시에 필요한 값만 세션에서 뽑아 담는다. 근거: docs/AuthSpec.md 1장.
 */
export interface SessionUser {
  /** Supabase auth.users.id (UUID). 투표·피드백의 `userId` 다. */
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}
