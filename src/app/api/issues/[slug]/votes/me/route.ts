import { getSessionUser } from '@/lib/supabase/getSessionUser';
import { decodeSlugParam } from '@/server/decodeRouteParam';
import { getServerVoteContext } from '@/server/isServerVoteEnabled';
import { toRouteResponse } from '@/server/routeResponse';
import { handleGetMyVote, serverVoteDisabledResponse } from '@/server/voteHandlers';

interface Context {
  params: Promise<{ slug: string }>;
}

/** `GET /api/issues/[slug]/votes/me` — 현재 분포와 내 선택. 비로그인이면 분포만 돌려준다. */
export const GET = async (request: Request, { params }: Context): Promise<Response> => {
  const context = getServerVoteContext();

  if (!context) {
    return toRouteResponse(serverVoteDisabledResponse());
  }

  const { slug } = await params;
  const sessionUser = await getSessionUser();

  return toRouteResponse(
    await handleGetMyVote({ store: context.store, sessionUser, slug: decodeSlugParam(slug) }),
  );
};
