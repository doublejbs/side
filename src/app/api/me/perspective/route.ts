import { getSessionUser } from '@/lib/supabase/getSessionUser';
import { getServerVoteContext } from '@/server/isServerVoteEnabled';
import { toRouteResponse } from '@/server/routeResponse';
import { handleMyPerspective, serverVoteDisabledResponse } from '@/server/voteHandlers';

/** 관점 축은 사람마다 다르고 서버에 저장하지도 않으므로 절대 캐시하지 않는다. */
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

/** 쿠키를 읽으므로 이 라우트만 요청 시 렌더된다(공개 페이지는 정적으로 남는다). */
export const dynamic = 'force-dynamic';

/**
 * `GET /api/me/perspective` — 내 표로 계산한 관점 축·의견 변화·근거 피드백 수.
 * 비로그인은 `401 LOGIN_REQUIRED`. 근거: docs/PerspectiveSpec.md 4장.
 */
export const GET = async (): Promise<Response> => {
  const context = getServerVoteContext();

  if (!context) {
    return toRouteResponse(serverVoteDisabledResponse(), NO_STORE_HEADERS);
  }

  const sessionUser = await getSessionUser();

  return toRouteResponse(
    await handleMyPerspective({ store: context.store, sessionUser }),
    NO_STORE_HEADERS,
  );
};
