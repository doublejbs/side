/** URL 파서가 무시하는 문자(공백 이하 제어문자 · DEL)의 마지막 코드포인트. */
const CONTROL_CHARACTER_MAX_CODE = 0x20;
const DELETE_CHARACTER_CODE = 0x7f;

/** 검증에만 쓰는 가상 origin. 실제로 요청하지 않는다. */
const BASE_ORIGIN = 'https://side.invalid';

const hasParserIgnoredCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);

    return code <= CONTROL_CHARACTER_MAX_CODE || code === DELETE_CHARACTER_CODE;
  });

/**
 * 로그인 후 되돌아갈 경로를 검증한다. 위험한 문자열을 하나씩 거부하는 대신
 * 가상 origin 기준으로 **파싱한 뒤 origin 이 그대로인지 확인**한다.
 * 거부 목록 방식은 제어문자(TAB·LF·CR)로 우회됐다. URL 파서가 이런 문자를 버리기 때문에
 * `/\n/evil.com` 은 파싱 시 `https://evil.com` 이 되어 외부로 새어 나갔다.
 * 파싱 결과의 origin 을 확인하면 파서가 실제로 해석한 대상만 통과하므로 우회가 불가능하다.
 * 근거: docs/AuthSpec.md 4.1.
 */
export const sanitizeNextPath = (value: string | null | undefined): string => {
  if (!value || !value.startsWith('/') || value.includes('\\')) {
    return '/';
  }

  if (hasParserIgnoredCharacter(value)) {
    return '/';
  }

  try {
    const url = new URL(value, BASE_ORIGIN);

    if (url.origin !== BASE_ORIGIN) {
      return '/';
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
};

/** 비로그인 사용자를 보낼 로그인 링크. `next` 는 항상 검증·인코딩한다. */
export const buildLoginHref = (next: string): string =>
  `/login?next=${encodeURIComponent(sanitizeNextPath(next))}`;
