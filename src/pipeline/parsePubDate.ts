/**
 * 네이버 뉴스 API 의 `pubDate`(RFC 2822, 예: `Thu, 28 Aug 2026 10:15:00 +0900`)를 `Date` 로 바꾼다.
 * 파싱할 수 없으면 `null` 을 돌려주고 호출부에서 해당 기사를 건너뛴다.
 */
export const parsePubDate = (rfc2822: string): Date | null => {
  const trimmed = rfc2822.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};
