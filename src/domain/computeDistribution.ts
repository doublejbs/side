import type { VoteDistribution } from '@/domain/Issue';
import { VoteChoice } from '@/domain/VoteChoice';

interface DistributionAfterVote {
  distribution: VoteDistribution;
  participantCount: number;
}

interface CountBucket {
  key: keyof VoteDistribution;
  count: number;
}

interface RawBucket {
  key: keyof VoteDistribution;
  floor: number;
  remainder: number;
}

const CHOICE_KEY: Record<VoteChoice, keyof VoteDistribution> = {
  [VoteChoice.AGREE]: 'agree',
  [VoteChoice.DISAGREE]: 'disagree',
  [VoteChoice.UNSURE]: 'unsure',
};

const DISTRIBUTION_KEYS: (keyof VoteDistribution)[] = ['agree', 'disagree', 'unsure'];

/** 내림한 값들의 합이 total 이 되도록 나머지가 큰 순서대로 1씩 더한다. */
const distributeLeftover = (buckets: RawBucket[], total: number): Map<keyof VoteDistribution, number> => {
  const assigned = buckets.reduce((sum, bucket) => sum + bucket.floor, 0);
  const ordered = [...buckets].sort((a, b) => b.remainder - a.remainder);
  const bonus = new Map<keyof VoteDistribution, number>();

  let leftover = total - assigned;

  ordered.forEach((bucket) => {
    if (leftover > 0) {
      bonus.set(bucket.key, 1);
      leftover -= 1;
    }
  });

  return bonus;
};

const toRawBucket = (key: keyof VoteDistribution, exact: number): RawBucket => ({
  key,
  floor: Math.floor(exact),
  remainder: exact - Math.floor(exact),
});

/** 퍼센트와 참여자 수로부터 표 수를 복원한다. 복원한 표의 합은 항상 참여자 수와 같다. */
const restoreCounts = (
  distribution: VoteDistribution,
  participantCount: number,
): CountBucket[] => {
  const buckets = DISTRIBUTION_KEYS.map((key) =>
    toRawBucket(key, (distribution[key] / 100) * participantCount),
  );
  const bonus = distributeLeftover(buckets, participantCount);

  return buckets.map((bucket) => ({
    key: bucket.key,
    count: bucket.floor + (bonus.get(bucket.key) ?? 0),
  }));
};

/** 가장 큰 나머지 방식으로 퍼센트 합이 정확히 100이 되도록 계산한다. */
const toPercentages = (buckets: CountBucket[], total: number): VoteDistribution => {
  if (total <= 0) {
    return { agree: 0, disagree: 0, unsure: 0 };
  }

  const rawBuckets = buckets.map((bucket) => toRawBucket(bucket.key, (bucket.count / total) * 100));
  const bonus = distributeLeftover(rawBuckets, 100);
  const result: VoteDistribution = { agree: 0, disagree: 0, unsure: 0 };

  rawBuckets.forEach((bucket) => {
    result[bucket.key] = bucket.floor + (bonus.get(bucket.key) ?? 0);
  });

  return result;
};

export const computeDistributionAfterVote = (
  base: VoteDistribution,
  participantCount: number,
  choice: VoteChoice,
): DistributionAfterVote => {
  const chosenKey = CHOICE_KEY[choice];
  const buckets = restoreCounts(base, participantCount).map((bucket) =>
    bucket.key === chosenKey ? { ...bucket, count: bucket.count + 1 } : bucket,
  );

  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return {
    distribution: toPercentages(buckets, total),
    participantCount: total,
  };
};
