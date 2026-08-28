/** 숫자 엔티티를 제외한 명명 엔티티 표. 네이버 뉴스 API 응답에 실제로 등장하는 것만 담는다. */
const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  amp: '&',
  lt: '<',
  gt: '>',
  '#39': "'",
  apos: "'",
  nbsp: ' ',
};

/** `&#39;` `&#x27;` 형태의 숫자 엔티티를 문자로 바꾼다. 범위를 벗어나면 원문을 유지한다. */
const decodeNumericEntity = (body: string): string | null => {
  const isHex = body[1] === 'x' || body[1] === 'X';
  const digits = isHex ? body.slice(2) : body.slice(1);

  if (digits.length === 0) {
    return null;
  }

  const codePoint = Number.parseInt(digits, isHex ? 16 : 10);

  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return null;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return null;
  }
};

/**
 * 뉴스 제목·설명에서 HTML 태그(`<b>` 등)를 제거하고 엔티티를 디코드한 뒤
 * 연속 공백을 하나로 줄인다. 근거: docs/PipelineSpec.md 4.1.
 */
export const stripHtml = (input: string): string => {
  if (input.length === 0) {
    return '';
  }

  const withoutTags = input.replace(/<[^>]*>/g, ' ');

  const decoded = withoutTags.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body.startsWith('#')) {
      return decodeNumericEntity(body) ?? match;
    }

    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });

  return decoded.replace(/\s+/g, ' ').trim();
};
