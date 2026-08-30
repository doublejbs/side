import { getIssueRepository } from '@/data/getIssueRepository';
import { decodeSlugParam } from '@/server/decodeRouteParam';
import { VoteApiErrorCode } from '@/server/VoteApiErrorCode';

interface Context {
  params: Promise<{ slug: string }>;
}

/** `GET /api/issues/[slug]` — 이슈 상세. 목 데이터 모드에서도 정상 동작한다. */
export const GET = async (request: Request, { params }: Context): Promise<Response> => {
  const { slug } = await params;
  const issue = await getIssueRepository().getIssueBySlug(decodeSlugParam(slug));

  if (!issue) {
    return Response.json({ error: VoteApiErrorCode.ISSUE_NOT_FOUND }, { status: 404 });
  }

  return Response.json(issue);
};
