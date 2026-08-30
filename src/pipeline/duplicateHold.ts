import { IssueStatus, type PrismaClient } from '@prisma/client';

import { issueClassificationSchema } from '@/data/IssueJsonSchemas';

/**
 * classify 가 중복으로 표시한 이슈를 비싼 단계(summarize·extract)에서 뒤로 미루는 규칙.
 * 자동 병합은 하지 않고, 같은 실행에서 한 번만 처리되도록 대상에서 빼고 메모만 남긴다.
 * 근거: `docs/PipelineTieringSpec.md` 4.2장.
 */

/** 중복으로 보류한 이슈의 검수 메모에 남기는 줄. 관리자가 복원·병합을 판단한다. */
export const duplicateHoldNote = (question: string): string => `[중복으로 보류] ${question}`;

/** 중복 대상이 이 상태면 새 이슈는 보류한다(이미 검수·발행 단계에 있는 이슈를 존중한다). */
const HOLD_TARGET_STATUSES: string[] = [IssueStatus.REVIEW, IssueStatus.PUBLISHED];

/** 보류 판단·정렬에 필요한 이슈의 최소 정보. */
export interface DuplicateAwareIssue {
  id: string;
  debateScore: number | null;
  classification: unknown;
  articles: unknown[];
}

/** 중복 대상 이슈의 최소 정보. */
export interface DuplicateTarget {
  id: string;
  status: string;
  question: string;
}

/** `Issue.classification` 에 저장된 중복 후보 id. 형식이 어긋나면 없는 것으로 다룬다. */
export const readDuplicateOfIssueId = (classification: unknown): string | undefined => {
  const parsed = issueClassificationSchema.safeParse(classification);

  if (!parsed.success) {
    return undefined;
  }

  return parsed.data.duplicateOfIssueId;
};

const compareTargets = (left: DuplicateAwareIssue, right: DuplicateAwareIssue): number => {
  const leftDuplicate = readDuplicateOfIssueId(left.classification) === undefined ? 0 : 1;
  const rightDuplicate = readDuplicateOfIssueId(right.classification) === undefined ? 0 : 1;

  if (leftDuplicate !== rightDuplicate) {
    return leftDuplicate - rightDuplicate;
  }

  const scoreGap = (right.debateScore ?? 0) - (left.debateScore ?? 0);

  if (scoreGap !== 0) {
    return scoreGap;
  }

  return right.articles.length - left.articles.length;
};

/** 처리 순서: 중복 표시가 없는 이슈 먼저 → 논쟁성 점수 내림차순 → 기사 수 내림차순. */
export const sortDuplicateAwareIssues = <T extends DuplicateAwareIssue>(issues: T[]): T[] =>
  [...issues].sort(compareTargets);

/** 대상 이슈들이 가리키는 중복 후보 id 목록(중복 제거). */
export const collectDuplicateOfIssueIds = (issues: DuplicateAwareIssue[]): string[] => [
  ...new Set(
    issues.flatMap((issue) => {
      const targetId = readDuplicateOfIssueId(issue.classification);

      return targetId === undefined || targetId === issue.id ? [] : [targetId];
    }),
  ),
];

/** 중복 후보 이슈의 질문·상태를 한 번에 읽는다. */
export const loadDuplicateTargets = async (
  prisma: PrismaClient,
  ids: string[],
): Promise<Map<string, DuplicateTarget>> => {
  if (ids.length === 0) {
    return new Map();
  }

  const rows = await prisma.issue.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, question: true },
  });

  return new Map(rows.map((row) => [row.id, row]));
};

/**
 * 보류할 이슈 → 중복 대상 질문. 처리 순서대로 훑으며 결정한다.
 *
 * 중복 표시를 들고 있는 이슈가 보류 대상이다. 다만 두 이슈가 서로를 가리키면
 * 둘 다 보류돼 아무것도 처리되지 않으므로, 대상이 이미 보류된 경우에는 보류하지 않는다.
 */
export const resolveDuplicateHolds = (
  ordered: DuplicateAwareIssue[],
  targets: Map<string, DuplicateTarget>,
): Map<string, string> => {
  const candidateIds = new Set(ordered.map((issue) => issue.id));
  const holds = new Map<string, string>();

  for (const issue of ordered) {
    const targetId = readDuplicateOfIssueId(issue.classification);

    if (targetId === undefined || targetId === issue.id || holds.has(targetId)) {
      continue;
    }

    const target = targets.get(targetId);

    if (!target) {
      continue;
    }

    if (candidateIds.has(targetId) || HOLD_TARGET_STATUSES.includes(target.status)) {
      holds.set(issue.id, target.question);
    }
  }

  return holds;
};
