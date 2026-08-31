import type { MyVote } from '@/domain/MyVote';
import type { VoteRecord } from '@/domain/UserRecord';
import { VoteChoice } from '@/domain/VoteChoice';

/**
 * 서버 집계(`MyVote[]`)와 목 모드 localStorage 기록을 같은 형태(slug → 내 선택)로 맞춘다.
 * "발견" 탭 계산이 두 모드에서 같은 입력을 쓰게 하려는 변환이다. 근거: docs/AuthSpec.md 4.4.
 */
export const toVoteChoiceBySlug = (votes: MyVote[]): Map<string, VoteChoice> =>
  new Map(votes.map((vote) => [vote.slug, vote.choice]));

/** 목 모드 전용. localStorage 투표 기록(키는 slug)을 같은 맵으로 바꾼다. */
export const toVoteChoiceBySlugFromRecords = (
  records: Record<string, VoteRecord>,
): Map<string, VoteChoice> =>
  new Map(Object.entries(records).map(([slug, record]) => [slug, record.choice]));
