const MAX_LENGTH = 60;

const MAX_SUFFIX = 100;

/**
 * slug 로 인정하는 최소 길이. `주 4일제를 도입해야 할까?` 처럼 한글을 걷어내면
 * `4` 한 글자만 남는 질문은 URL 로서 의미가 없어 폴백을 쓴다.
 */
const MIN_LENGTH = 2;

/** 폴백 slug 의 접두사. */
const FALLBACK_PREFIX = 'issue';

/** 폴백 slug 뒤에 붙이는 해시 길이. */
const HASH_LENGTH = 6;

/** FNV-1a 32비트 해시. 질문이 같으면 항상 같은 값이 나온다. */
const hashQuestion = (question: string): string => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < question.length; index += 1) {
    hash ^= question.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(36).padStart(HASH_LENGTH, '0').slice(-HASH_LENGTH);
};

/** `yyyymmdd`. 실행 환경의 시간대와 무관하도록 UTC 기준으로 만든다. */
const formatDateKey = (now: Date): string => now.toISOString().slice(0, 10).replace(/-/g, '');

/**
 * ASCII 로 남는 글자가 없을 때 쓰는 폴백 slug.
 * `issue-<yyyymmdd>-<6자 해시>` 형태이며, 같은 질문이면 같은 값이 나온다.
 */
const buildFallbackSlug = (question: string, now: Date): string =>
  `${FALLBACK_PREFIX}-${formatDateKey(now)}-${hashQuestion(question)}`;

/**
 * 질문에서 URL 식별자(slug)를 만든다.
 *
 * slug 는 ASCII(영문 소문자·숫자·하이픈)로만 만든다. 한글 slug 는 링크를 공유하거나
 * 다른 시스템에 붙여 넣을 때 퍼센트 인코딩돼 읽기 어렵고 라우팅에서도 어긋나기 쉽다.
 * 한글은 남기지 않고 버리며, 남는 글자가 없거나 너무 짧으면 날짜·해시 폴백을 쓴다.
 * 최대 60자.
 */
export const slugify = (question: string, now: Date = new Date()): string => {
  const normalized = question
    .toLowerCase()
    .replace(/[^0-9a-z\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '');

  if (normalized.length < MIN_LENGTH) {
    return buildFallbackSlug(question, now);
  }

  return normalized;
};

/** 이미 쓰이고 있는 slug 면 `-2`, `-3` … 을 붙여 비어 있는 값을 찾는다. */
export const resolveUniqueSlug = async (
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> => {
  const safeBase = base || FALLBACK_PREFIX;

  if (!(await isTaken(safeBase))) {
    return safeBase;
  }

  for (let suffix = 2; suffix <= MAX_SUFFIX; suffix += 1) {
    const candidate = `${safeBase}-${suffix}`;

    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error(`slug 를 만들 수 없습니다: ${safeBase}`);
};
