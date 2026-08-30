import { cookies } from 'next/headers';

import { decodeSlugParam } from '@/server/decodeRouteParam';
import { getServerVoteContext } from '@/server/isServerVoteEnabled';
import { readJsonBody, toRouteResponse } from '@/server/routeResponse';
import { handleCastVote, serverVoteDisabledResponse } from '@/server/voteHandlers';

interface Context {
  params: Promise<{ slug: string }>;
}

/** `POST /api/issues/[slug]/votes` — 익명 쿠키 기준 1인 1표 upsert. */
export const POST = async (request: Request, { params }: Context): Promise<Response> => {
  const context = getServerVoteContext();

  if (!context) {
    return toRouteResponse(serverVoteDisabledResponse());
  }

  const { slug } = await params;
  const cookieStore = await cookies();
  const body = await readJsonBody(request);

  return toRouteResponse(
    await handleCastVote({ ...context, cookieStore, slug: decodeSlugParam(slug), body }),
  );
};
