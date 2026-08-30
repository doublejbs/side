/**
 * 병합이 양쪽 이슈의 `reviewNote` 에 남기는 흔적.
 * Prisma 구현과 인메모리 구현이 같은 문장을 쓰도록 한곳에 모은다.
 * 근거: `docs/PipelineTieringSpec.md` 11.2.
 */

/** 원본 이슈에 남기는 줄. */
export const mergedSourceNote = (targetQuestion: string): string => `[병합됨 → ${targetQuestion}]`;

/** 대상 이슈에 남기는 줄. */
export const mergedTargetNote = (sourceQuestion: string, movedArticles: number): string =>
  `[병합 수신 ← ${sourceQuestion}, 기사 ${movedArticles}건]`;

/** 기존 메모는 지우지 않고 줄을 덧붙인다. */
export const appendReviewNote = (current: string | null, line: string): string =>
  current ? `${current}\n${line}` : line;
