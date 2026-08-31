import type { VoteCounts } from '@/data/voteAggregation';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { VoteChoice } from '@/domain/VoteChoice';
import { getVoteChoiceKey } from '@/domain/voteChoiceKey';
import type { ClaimedAnonRecordCounts, MyVoteRow, VoteStore } from '@/server/VoteStore';

interface SeedOptions {
  /** 발행된 이슈의 slug 를 이슈 id 로 매핑한 시드 데이터. 여기 없는 이슈는 미발행으로 다룬다. */
  issues?: Record<string, string>;
  claimIds?: string[];
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
  private readonly claimIds: Set<string>;
  private readonly votes = new Map<string, VoteEntry>();
  private readonly feedbacks = new Map<string, ClaimFeedback>();
  private readonly anonVotes = new Map<string, VoteEntry>();
  private readonly anonFeedbacks = new Map<string, ClaimFeedback>();
  private sequence = 0;

  constructor({ issues = {}, claimIds = [] }: SeedOptions = {}) {
    this.issueIdBySlug = new Map(Object.entries(issues));
    this.claimIds = new Set(claimIds);
  }

  async getIssueIdBySlug(slug: string): Promise<string | null> {
    return this.issueIdBySlug.get(slug) ?? null;
  }

  async castVote(issueId: string, userId: string, choice: VoteChoice): Promise<void> {
    this.votes.set(buildKey(issueId, userId), this.createEntry(choice));
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
    const slugByIssueId = new Map(
      [...this.issueIdBySlug.entries()].map(([slug, issueId]) => [issueId, slug]),
    );
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

  private createEntry(choice: VoteChoice): VoteEntry {
    this.sequence += 1;

    return { choice, votedAt: new Date().toISOString(), seq: this.sequence };
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
