import { cookies } from 'next/headers';

import { getServerVoteContext } from '@/server/isServerVoteEnabled';
import { readJsonBody, toRouteResponse } from '@/server/routeResponse';
import { handleClaimFeedback, serverVoteDisabledResponse } from '@/server/voteHandlers';

interface Context {
  params: Promise<{ claimId: string }>;
}

/** `POST /api/claims/[claimId]/feedback` — 근거 피드백 upsert. 본문의 `feedback` 이 null 이면 해제. */
export const POST = async (request: Request, { params }: Context): Promise<Response> => {
  const context = getServerVoteContext();

  if (!context) {
    return toRouteResponse(serverVoteDisabledResponse());
  }

  const { claimId } = await params;
  const cookieStore = await cookies();
  const body = await readJsonBody(request);

  return toRouteResponse(await handleClaimFeedback({ ...context, cookieStore, claimId, body }));
};
