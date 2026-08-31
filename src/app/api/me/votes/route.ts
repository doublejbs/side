import { getSessionUser } from '@/lib/supabase/getSessionUser';
import { getServerVoteContext } from '@/server/isServerVoteEnabled';
import { toRouteResponse } from '@/server/routeResponse';
import { handleListMyVotes, serverVoteDisabledResponse } from '@/server/voteHandlers';

/** 내 투표 목록은 사람마다 다르므로 절대 캐시하지 않는다. */
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

/** 쿠키를 읽으므로 이 라우트만 요청 시 렌더된다(공개 페이지는 정적으로 남는다). */
export const dynamic = 'force-dynamic';

/**
 * `GET /api/me/votes` — 로그인 사용자가 던진 표 전체. 비로그인은 `401 LOGIN_REQUIRED`.
 * 화면은 `useMyVotes()` 로 읽는다. 근거: docs/AuthSpec.md 4.4.
 */
export const GET = async (): Promise<Response> => {
  const context = getServerVoteContext();

  if (!context) {
    return toRouteResponse(serverVoteDisabledResponse(), NO_STORE_HEADERS);
  }

  const sessionUser = await getSessionUser();

  return toRouteResponse(
    await handleListMyVotes({ store: context.store, sessionUser }),
    NO_STORE_HEADERS,
  );
};
