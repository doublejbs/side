import { getIssueRepository } from '@/data/getIssueRepository';
import { toIssueSummary } from '@/domain/IssueSummary';
import type { IssueSummary } from '@/domain/IssueSummary';

/** `GET /api/issues` — 발행된 이슈 목록. 목 데이터 모드에서도 정상 동작한다. */
export const GET = async (): Promise<Response> => {
  const issues = await getIssueRepository().listPublishedIssues();
  const body: IssueSummary[] = issues.map(toIssueSummary);

  return Response.json(body);
};
