const SAFE_PROTOCOLS = ['http:', 'https:'];

/**
 * 화면에 링크로 노출되는 주소인지 확인한다.
 * `javascript:`·`data:` 처럼 실행 가능한 스킴과 파싱 불가 문자열은 모두 거부한다.
 */
export const isSafeHttpUrl = (value: string): boolean => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return false;
  }

  try {
    const url = new URL(trimmed);

    return SAFE_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
};
