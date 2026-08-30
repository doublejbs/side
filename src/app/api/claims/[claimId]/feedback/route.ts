import { getSessionUser } from '@/lib/supabase/getSessionUser';
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
  const [sessionUser, body] = await Promise.all([getSessionUser(), readJsonBody(request)]);

  return toRouteResponse(
    await handleClaimFeedback({ store: context.store, sessionUser, claimId, body }),
  );
};
