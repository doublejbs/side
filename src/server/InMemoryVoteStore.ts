import type { VoteCounts } from '@/data/voteAggregation';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import type { IssueAxis } from '@/domain/IssueAxis';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceKey } from '@/domain/voteChoiceKey';
import {
  MAX_MY_VOTE_EVENTS,
  type ClaimedAnonRecordCounts,
  type MyPersuadedClaimRow,
  type MyVoteAxesRow,
  type MyVoteEventRow,
  type MyVoteRow,
  type VoteStore,
} from '@/server/VoteStore';

/** 관점·의견 변화 테스트가 필요로 하는 이슈 메타데이터. slug 로 찾는다. */
export interface SeedIssueDetail {
  question?: string;
  axes?: IssueAxis[];
}

/** 의견 변화에 붙일 주장 제목까지 필요한 테스트가 쓰는 시드 주장. */
export interface SeedClaim {
  id: string;
  /** 주장이 속한 이슈의 slug. `issues` 에 있어야 발행된 이슈로 다룬다. */
  issueSlug: string;
  title: string;
}

interface SeedOptions {
  /** 발행된 이슈의 slug 를 이슈 id 로 매핑한 시드 데이터. 여기 없는 이슈는 미발행으로 다룬다. */
  issues?: Record<string, string>;
  /** slug → 질문·관점 축. 관점 계산·의견 변화 테스트에서만 채운다. */
  issueDetails?: Record<string, SeedIssueDetail>;
  claimIds?: string[];
  /** 이슈에 속한 주장. `claimIds` 와 함께 `claimExists` 의 대상이 된다. */
  claims?: SeedClaim[];
}

/** 표·이벤트 시각의 기준. 실제 시각을 쓰지 않아 테스트가 결정적이다. */
const CLOCK_ORIGIN_MS = Date.UTC(2026, 7, 1);

/** 쓰기 한 번마다 흐르는 시간. 같은 밀리초에 여러 표가 겹치지 않게 한다. */
const CLOCK_STEP_MS = 1000;

/** 투표 이력 한 건. `castVote` 가 신규·변경일 때만 쌓는다. */
interface VoteEventEntry {
  issueId: string;
  userId: string;
  choice: VoteChoice;
  /** ISO 8601 */
  createdAt: string;
  seq: number;
}

/** 한 표의 저장 형태. 최근 순서를 재현하려고 시각과 순번을 함께 담는다. */
interface VoteEntry {
  choice: VoteChoice;
  /** ISO 8601 */
  votedAt: string;
  /** 같은 밀리초에 여러 표가 들어와도 최근 순서를 지킬 수 있게 하는 순번. */
  seq: number;
}

const SEPARATOR = ' ';

const buildKey = (first: string, second: string): string => `${first}${SEPARATOR}${second}`;

const splitKey = (key: string): { owner: string; target: string } => {
  const index = key.indexOf(SEPARATOR);

  return { target: key.slice(0, index), owner: key.slice(index + SEPARATOR.length) };
};

/**
 * DB 없이 라우트 핸들러를 검증하기 위한 인메모리 구현.
 * 계정 표와 아직 이전되지 않은 익명 표를 따로 담아 `countVotes` 에서 함께 센다.
 */
export class InMemoryVoteStore implements VoteStore {
  private readonly issueIdBySlug: Map<string, string>;
  private readonly detailBySlug: Map<string, SeedIssueDetail>;
  private readonly claimIds: Set<string>;
  private readonly claimsById: Map<string, SeedClaim>;
  private readonly votes = new Map<string, VoteEntry>();
  private readonly voteEvents: VoteEventEntry[] = [];
  private readonly feedbacks = new Map<string, ClaimFeedback>();
  private readonly anonVotes = new Map<string, VoteEntry>();
  private readonly anonFeedbacks = new Map<string, ClaimFeedback>();
  private sequence = 0;

  constructor({ issues = {}, issueDetails = {}, claimIds = [], claims = [] }: SeedOptions = {}) {
    this.issueIdBySlug = new Map(Object.entries(issues));
    this.detailBySlug = new Map(Object.entries(issueDetails));
    this.claimIds = new Set([...claimIds, ...claims.map((claim) => claim.id)]);
    this.claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  }

  async getIssueIdBySlug(slug: string): Promise<string | null> {
    return this.issueIdBySlug.get(slug) ?? null;
  }

  async castVote(issueId: string, userId: string, choice: VoteChoice): Promise<void> {
    const key = buildKey(issueId, userId);
    const previous = this.votes.get(key);
    const entry = this.createEntry(choice);

    this.votes.set(key, entry);

    // 같은 선택을 다시 눌렀을 뿐이면 이력을 남기지 않는다(docs/PerspectiveSpec.md 2장).
    if (previous?.choice === choice) {
      return;
    }

    this.voteEvents.push({
      issueId,
      userId,
      choice,
      createdAt: entry.votedAt,
      seq: entry.seq,
    });
  }

  async getMyVote(issueId: string, userId: string): Promise<VoteChoice | null> {
    return this.votes.get(buildKey(issueId, userId))?.choice ?? null;
  }

  async countVotes(issueId: string): Promise<VoteCounts> {
    const counts: VoteCounts = { agree: 0, disagree: 0, unsure: 0 };
    const prefix = `${issueId}${SEPARATOR}`;
    const add = (entry: VoteEntry, key: string): void => {
      if (key.startsWith(prefix)) {
        counts[getVoteChoiceKey(entry.choice)] += 1;
      }
    };

    this.votes.forEach(add);
    this.anonVotes.forEach(add);

    return counts;
  }

  async listMyVotes(userId: string): Promise<MyVoteRow[]> {
    const slugByIssueId = this.buildSlugByIssueId();
    const rows: { issueSlug: string; entry: VoteEntry }[] = [];

    this.votes.forEach((entry, key) => {
      const { owner, target } = splitKey(key);
      const issueSlug = slugByIssueId.get(target);

      // 시드에 없는 이슈는 아직 발행되지 않은 이슈다. 화면이 가리킬 수 없으므로 뺀다.
      if (owner !== userId || issueSlug === undefined) {
        return;
      }

      rows.push({ issueSlug, entry });
    });

    return rows
      .sort((left, right) => right.entry.seq - left.entry.seq)
      .map(({ issueSlug, entry }) => ({
        issueSlug,
        choice: entry.choice,
        votedAt: entry.votedAt,
      }));
  }

  async listMyVoteEvents(userId: string): Promise<MyVoteEventRow[]> {
    const slugByIssueId = this.buildSlugByIssueId();

    const recent = this.voteEvents
      .filter((event) => event.userId === userId && slugByIssueId.has(event.issueId))
      .sort((left, right) => left.seq - right.seq)
      // 최근 이력부터 상한만큼만 남긴다(Prisma 구현과 같은 규칙).
      .slice(-MAX_MY_VOTE_EVENTS);

    return recent.map((event) => {
      const issueSlug = slugByIssueId.get(event.issueId) ?? null;

      return {
        issueId: event.issueId,
        issueSlug,
        question: issueSlug === null ? null : this.getQuestion(issueSlug),
        choice: event.choice,
        createdAt: event.createdAt,
      };
    });
  }

  async listMyPersuadedClaims(userId: string): Promise<MyPersuadedClaimRow[]> {
    const rows: MyPersuadedClaimRow[] = [];

    this.feedbacks.forEach((feedback, key) => {
      const { owner, target } = splitKey(key);
      const claim = this.claimsById.get(target);
      const issueId = claim ? this.issueIdBySlug.get(claim.issueSlug) : undefined;

      if (owner !== userId || feedback !== ClaimFeedback.PERSUADED || !claim || !issueId) {
        return;
      }

      rows.push({ issueId, claimTitle: claim.title });
    });

    return rows;
  }

  async countMyClaimFeedbacks(userId: string): Promise<number> {
    let count = 0;

    this.feedbacks.forEach((_feedback, key) => {
      if (splitKey(key).owner === userId) {
        count += 1;
      }
    });

    return count;
  }

  async listMyVoteAxes(userId: string): Promise<MyVoteAxesRow[]> {
    const slugByIssueId = this.buildSlugByIssueId();
    const rows: MyVoteAxesRow[] = [];

    this.votes.forEach((entry, key) => {
      const { owner, target } = splitKey(key);
      const issueSlug = slugByIssueId.get(target);

      if (owner !== userId || issueSlug === undefined) {
        return;
      }

      rows.push({ axes: this.detailBySlug.get(issueSlug)?.axes ?? [], choice: entry.choice });
    });

    return rows;
  }

  async setClaimFeedback(
    claimId: string,
    userId: string,
    feedback: ClaimFeedback | null,
  ): Promise<void> {
    const key = buildKey(claimId, userId);

    if (feedback === null) {
      this.feedbacks.delete(key);

      return;
    }

    this.feedbacks.set(key, feedback);
  }

  async getMyClaimFeedback(claimId: string, userId: string): Promise<ClaimFeedback | null> {
    return this.feedbacks.get(buildKey(claimId, userId)) ?? null;
  }

  async claimExists(claimId: string): Promise<boolean> {
    return this.claimIds.has(claimId);
  }

  async claimAnonRecords(anonId: string, userId: string): Promise<ClaimedAnonRecordCounts> {
    const votes = this.moveAnonRecords(this.anonVotes, this.votes, anonId, userId);
    const feedbacks = this.moveAnonRecords(this.anonFeedbacks, this.feedbacks, anonId, userId);

    return { votes, feedbacks };
  }

  /** 아직 이전되지 않은 익명 표를 넣는다. 테스트가 이전 시나리오를 만들 때만 쓴다. */
  seedAnonVote(issueId: string, anonId: string, choice: VoteChoice): void {
    this.anonVotes.set(buildKey(issueId, anonId), this.createEntry(choice));
  }

  /** 아직 이전되지 않은 익명 피드백을 넣는다. 테스트가 이전 시나리오를 만들 때만 쓴다. */
  seedAnonClaimFeedback(claimId: string, anonId: string, feedback: ClaimFeedback): void {
    this.anonFeedbacks.set(buildKey(claimId, anonId), feedback);
  }

  /** 이슈 id → slug. 시드에 없는 이슈는 아직 발행되지 않은 이슈다. */
  private buildSlugByIssueId(): Map<string, string> {
    return new Map(
      [...this.issueIdBySlug.entries()].map(([slug, issueId]) => [issueId, slug] as const),
    );
  }

  /** 시드에 질문이 없으면 slug 를 그대로 질문으로 쓴다. */
  private getQuestion(slug: string): string {
    return this.detailBySlug.get(slug)?.question ?? slug;
  }

  private createEntry(choice: VoteChoice): VoteEntry {
    this.sequence += 1;

    return {
      choice,
      votedAt: new Date(CLOCK_ORIGIN_MS + this.sequence * CLOCK_STEP_MS).toISOString(),
      seq: this.sequence,
    };
  }

  /** 익명 표를 계정으로 옮긴다. 계정 레코드가 이미 있으면 익명 쪽을 버린다. */
  private moveAnonRecords<Value>(
    anonRecords: Map<string, Value>,
    userRecords: Map<string, Value>,
    anonId: string,
    userId: string,
  ): number {
    let moved = 0;

    [...anonRecords.entries()].forEach(([key, value]) => {
      const { owner, target } = splitKey(key);

      if (owner !== anonId) {
        return;
      }

      anonRecords.delete(key);

      const userKey = buildKey(target, userId);

      if (userRecords.has(userKey)) {
        return;
      }

      userRecords.set(userKey, value);
      moved += 1;
    });

    return moved;
  }
}
