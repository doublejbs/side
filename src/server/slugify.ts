const MAX_LENGTH = 60;

const MAX_SUFFIX = 100;

/** 질문이 비어 있거나 특수문자뿐일 때 쓰는 기본 slug. */
const FALLBACK_SLUG = 'issue';

/** 한글·영문·숫자만 남기고 공백은 `-` 로 바꾼 소문자 slug 를 만든다. 최대 60자. */
export const slugify = (question: string): string => {
  const normalized = question
    .toLowerCase()
    .replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '');

  return normalized || FALLBACK_SLUG;
};

/** 이미 쓰이고 있는 slug 면 `-2`, `-3` … 을 붙여 비어 있는 값을 찾는다. */
export const resolveUniqueSlug = async (
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> => {
  const safeBase = base || FALLBACK_SLUG;

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
