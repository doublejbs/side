import { NextResponse } from 'next/server';

import type { SessionUser } from '@/domain/SessionUser';
import { getSessionUser } from '@/lib/supabase/getSessionUser';

/** 세션은 요청마다 달라지므로 절대 캐시하지 않는다. */
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

/** 쿠키를 읽으므로 이 라우트만 요청 시 렌더된다(공개 페이지는 정적으로 남는다). */
export const dynamic = 'force-dynamic';

/**
 * `GET /api/session` — 현재 로그인 사용자(`SessionUser | null`).
 *
 * 공개 화면(`/`·`/discover`·`/me`·`/issues/**`)이 서버에서 세션을 읽으면 전부 동적 렌더가 되어
 * ISR(`revalidate = 60`)과 승인 시 `revalidatePath` 가 무력화된다. 그래서 세션 판정은
 * 이 경량 라우트 하나로 모으고 화면은 클라이언트에서 읽는다. 근거: docs/AuthSpec.md 4.4.
 */
export const GET = async (): Promise<Response> => {
  const user: SessionUser | null = await getSessionUser();

  return NextResponse.json(user, { headers: NO_STORE_HEADERS });
};
