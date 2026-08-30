import { getSessionUser } from '@/lib/supabase/getSessionUser';
import { decodeSlugParam } from '@/server/decodeRouteParam';
import { getServerVoteContext } from '@/server/isServerVoteEnabled';
import { readJsonBody, toRouteResponse } from '@/server/routeResponse';
import { handleCastVote, serverVoteDisabledResponse } from '@/server/voteHandlers';

interface Context {
  params: Promise<{ slug: string }>;
}

/** `POST /api/issues/[slug]/votes` — 로그인 사용자 기준 1인 1표 upsert. */
export const POST = async (request: Request, { params }: Context): Promise<Response> => {
  const context = getServerVoteContext();

  if (!context) {
    return toRouteResponse(serverVoteDisabledResponse());
  }

  const { slug } = await params;
  const [sessionUser, body] = await Promise.all([getSessionUser(), readJsonBody(request)]);

  return toRouteResponse(
    await handleCastVote({
      store: context.store,
      sessionUser,
      slug: decodeSlugParam(slug),
      body,
    }),
  );
};
