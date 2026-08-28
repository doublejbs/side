import { z } from 'zod';

import { aggregateVotes } from '@/data/voteAggregation';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import type { ClaimFeedbackResponse, VoteResultResponse } from '@/domain/VoteApiTypes';
import { buildAnonCookie, readOrCreateAnonId } from '@/server/anonCookie';
import type { AnonCookie, AnonCookieReader } from '@/server/anonCookie';
import { VoteApiErrorCode } from '@/server/VoteApiErrorCode';
import type { VoteStore } from '@/server/VoteStore';

/** 라우트 파일이 그대로 `Response` 로 옮겨 담는 결과. */
export interface HandlerResponse {
  status: number;
  body: unknown;
  /** 익명 식별자를 새로 만들었을 때만 채워진다. */
  setCookie?: AnonCookie;
}

interface BaseDeps {
  store: VoteStore;
  secret: string;
  cookieStore: AnonCookieReader;
}

export interface VoteDeps extends BaseDeps {
  slug: string;
}

export interface CastVoteDeps extends VoteDeps {
  body: unknown;
}

export interface ClaimFeedbackDeps extends BaseDeps {
  claimId: string;
  body: unknown;
}

const castVoteSchema = z.object({ choice: z.enum(VoteChoice) });

const claimFeedbackSchema = z.object({ feedback: z.enum(ClaimFeedback).nullable() });

const toErrorResponse = (status: number, error: VoteApiErrorCode): HandlerResponse => ({
  status,
  body: { error },
});

/** 목 데이터 모드이거나 쿠키 비밀키가 없을 때 쓰기 API 가 돌려줄 응답. */
export const serverVoteDisabledResponse = (): HandlerResponse =>
  toErrorResponse(503, VoteApiErrorCode.SERVER_VOTE_DISABLED);

const buildVoteResult = async (
  store: VoteStore,
  slug: string,
  issueId: string,
  anonId: string,
): Promise<VoteResultResponse> => {
  const [counts, myChoice] = await Promise.all([
    store.countVotes(issueId),
    store.getMyVote(issueId, anonId),
  ]);
  const { distribution, participantCount } = aggregateVotes(counts);

  return { slug, distribution, participantCount, myChoice };
};

const withAnonCookie = (
  response: HandlerResponse,
  isNew: boolean,
  anonId: string,
  secret: string,
): HandlerResponse => (isNew ? { ...response, setCookie: buildAnonCookie(anonId, secret) } : response);

/** `GET /api/issues/[slug]/votes/me` — 현재 분포와 내 선택을 함께 돌려준다. */
export const handleGetMyVote = async ({
  store,
  secret,
  cookieStore,
  slug,
}: VoteDeps): Promise<HandlerResponse> => {
  const issueId = await store.getIssueIdBySlug(slug);

  if (!issueId) {
    return toErrorResponse(404, VoteApiErrorCode.ISSUE_NOT_FOUND);
  }

  const { anonId, isNew } = readOrCreateAnonId(cookieStore, secret);
  const body = await buildVoteResult(store, slug, issueId, anonId);

  return withAnonCookie({ status: 200, body }, isNew, anonId, secret);
};

/** `POST /api/issues/[slug]/votes` — 1인 1표 upsert 후 갱신된 분포를 돌려준다. */
export const handleCastVote = async ({
  store,
  secret,
  cookieStore,
  slug,
  body,
}: CastVoteDeps): Promise<HandlerResponse> => {
  const parsed = castVoteSchema.safeParse(body);

  if (!parsed.success) {
    return toErrorResponse(400, VoteApiErrorCode.INVALID_BODY);
  }

  const issueId = await store.getIssueIdBySlug(slug);

  if (!issueId) {
    return toErrorResponse(404, VoteApiErrorCode.ISSUE_NOT_FOUND);
  }

  const { anonId, isNew } = readOrCreateAnonId(cookieStore, secret);

  await store.castVote(issueId, anonId, parsed.data.choice);

  const result = await buildVoteResult(store, slug, issueId, anonId);

  return withAnonCookie({ status: 200, body: result }, isNew, anonId, secret);
};

/** `POST /api/claims/[claimId]/feedback` — `feedback` 이 null 이면 기록을 지운다. */
export const handleClaimFeedback = async ({
  store,
  secret,
  cookieStore,
  claimId,
  body,
}: ClaimFeedbackDeps): Promise<HandlerResponse> => {
  const parsed = claimFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return toErrorResponse(400, VoteApiErrorCode.INVALID_BODY);
  }

  if (!(await store.claimExists(claimId))) {
    return toErrorResponse(404, VoteApiErrorCode.CLAIM_NOT_FOUND);
  }

  const { anonId, isNew } = readOrCreateAnonId(cookieStore, secret);

  await store.setClaimFeedback(claimId, anonId, parsed.data.feedback);

  const responseBody: ClaimFeedbackResponse = {
    claimId,
    feedback: await store.getMyClaimFeedback(claimId, anonId),
  };

  return withAnonCookie({ status: 200, body: responseBody }, isNew, anonId, secret);
};
