import { z } from 'zod';

import { aggregateVotes } from '@/data/voteAggregation';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { MyVote } from '@/domain/MyVote';
import type { SessionUser } from '@/domain/SessionUser';
import { VoteChoice } from '@/domain/VoteChoice';
import type {
  ClaimFeedbackResponse,
  MyVotesResponse,
  VoteResultResponse,
} from '@/domain/VoteApiTypes';
import { VoteApiErrorCode } from '@/server/VoteApiErrorCode';
import type { MyVoteRow, VoteStore } from '@/server/VoteStore';

/** 라우트 파일이 그대로 `Response` 로 옮겨 담는 결과. */
export interface HandlerResponse {
  status: number;
  body: unknown;
}

interface BaseDeps {
  store: VoteStore;
  /** 비로그인이면 null. 쓰기 API 는 401 로 막고, 읽기 API 는 내 선택만 비운다. */
  sessionUser: SessionUser | null;
}

export type ListMyVotesDeps = BaseDeps;

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

/** 로그인이 필요한 API 에 비로그인으로 들어왔을 때의 응답. */
const loginRequiredResponse = (): HandlerResponse =>
  toErrorResponse(401, VoteApiErrorCode.LOGIN_REQUIRED);

const buildVoteResult = async (
  store: VoteStore,
  slug: string,
  issueId: string,
  userId: string | null,
): Promise<VoteResultResponse> => {
  const [counts, myChoice] = await Promise.all([
    store.countVotes(issueId),
    userId ? store.getMyVote(issueId, userId) : Promise.resolve(null),
  ]);
  const { distribution, participantCount } = aggregateVotes(counts);

  return { slug, distribution, participantCount, myChoice };
};

/**
 * `GET /api/issues/[slug]/votes/me` — 현재 분포와 내 선택을 함께 돌려준다.
 * 비로그인도 결과는 볼 수 있으므로 `myChoice` 만 null 이다(docs/AuthSpec.md 4.2).
 */
export const handleGetMyVote = async ({
  store,
  sessionUser,
  slug,
}: VoteDeps): Promise<HandlerResponse> => {
  const issueId = await store.getIssueIdBySlug(slug);

  if (!issueId) {
    return toErrorResponse(404, VoteApiErrorCode.ISSUE_NOT_FOUND);
  }

  return { status: 200, body: await buildVoteResult(store, slug, issueId, sessionUser?.id ?? null) };
};

/** 화면은 slug 로만 이슈를 가리키므로 아직 발행되지 않은 이슈의 표는 목록에서 뺀다. */
const toMyVotes = (rows: MyVoteRow[]): MyVote[] =>
  rows.flatMap((row) =>
    row.issueSlug === null
      ? []
      : [{ slug: row.issueSlug, choice: row.choice, votedAt: row.votedAt }],
  );

/**
 * `GET /api/me/votes` — 내가 던진 표 전체(최근 순).
 * "나"·"발견" 탭의 내 투표 집계를 localStorage 대신 `userId` 기준 서버 집계로 채운다.
 * 근거: docs/AuthSpec.md 4.4.
 */
export const handleListMyVotes = async ({
  store,
  sessionUser,
}: ListMyVotesDeps): Promise<HandlerResponse> => {
  if (!sessionUser) {
    return loginRequiredResponse();
  }

  const body: MyVotesResponse = { votes: toMyVotes(await store.listMyVotes(sessionUser.id)) };

  return { status: 200, body };
};

/** `POST /api/issues/[slug]/votes` — 로그인 사용자 1인 1표 upsert 후 갱신된 분포를 돌려준다. */
export const handleCastVote = async ({
  store,
  sessionUser,
  slug,
  body,
}: CastVoteDeps): Promise<HandlerResponse> => {
  if (!sessionUser) {
    return loginRequiredResponse();
  }

  const parsed = castVoteSchema.safeParse(body);

  if (!parsed.success) {
    return toErrorResponse(400, VoteApiErrorCode.INVALID_BODY);
  }

  const issueId = await store.getIssueIdBySlug(slug);

  if (!issueId) {
    return toErrorResponse(404, VoteApiErrorCode.ISSUE_NOT_FOUND);
  }

  await store.castVote(issueId, sessionUser.id, parsed.data.choice);

  return { status: 200, body: await buildVoteResult(store, slug, issueId, sessionUser.id) };
};

/** `POST /api/claims/[claimId]/feedback` — `feedback` 이 null 이면 기록을 지운다. */
export const handleClaimFeedback = async ({
  store,
  sessionUser,
  claimId,
  body,
}: ClaimFeedbackDeps): Promise<HandlerResponse> => {
  if (!sessionUser) {
    return loginRequiredResponse();
  }

  const parsed = claimFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return toErrorResponse(400, VoteApiErrorCode.INVALID_BODY);
  }

  if (!(await store.claimExists(claimId))) {
    return toErrorResponse(404, VoteApiErrorCode.CLAIM_NOT_FOUND);
  }

  await store.setClaimFeedback(claimId, sessionUser.id, parsed.data.feedback);

  const responseBody: ClaimFeedbackResponse = {
    claimId,
    feedback: await store.getMyClaimFeedback(claimId, sessionUser.id),
  };

  return { status: 200, body: responseBody };
};
