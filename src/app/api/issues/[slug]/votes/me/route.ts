import { cookies } from 'next/headers';

import { decodeSlugParam } from '@/server/decodeRouteParam';
import { getServerVoteContext } from '@/server/isServerVoteEnabled';
import { toRouteResponse } from '@/server/routeResponse';
import { handleGetMyVote, serverVoteDisabledResponse } from '@/server/voteHandlers';

interface Context {
  params: Promise<{ slug: string }>;
}

/** `GET /api/issues/[slug]/votes/me` — 현재 분포와 내 선택. */
export const GET = async (request: Request, { params }: Context): Promise<Response> => {
  const context = getServerVoteContext();

  if (!context) {
    return toRouteResponse(serverVoteDisabledResponse());
  }

  const { slug } = await params;
  const cookieStore = await cookies();

  return toRouteResponse(
    await handleGetMyVote({ ...context, cookieStore, slug: decodeSlugParam(slug) }),
  );
};
