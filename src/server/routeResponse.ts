import type { HandlerResponse } from '@/server/voteHandlers';

/** 핸들러 결과를 `Response` 로 옮긴다. */
export const toRouteResponse = (result: HandlerResponse): Response =>
  Response.json(result.body, { status: result.status });

/** 잘못된 JSON 은 핸들러의 스키마 검증에서 400 으로 걸리도록 null 로 넘긴다. */
export const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};
