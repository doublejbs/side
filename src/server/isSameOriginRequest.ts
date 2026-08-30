/** 브라우저가 `Origin` 을 붙이지 않았을 때 대신 볼 헤더에서 허용하는 값. */
const SAME_ORIGIN_FETCH_SITES = ['same-origin', 'none'];

/**
 * 브라우저가 스스로 붙이는 헤더(`Origin`·`Sec-Fetch-Site`)만 보고 교차 출처 POST 를 막는다(CSRF).
 * 두 헤더는 스크립트가 위조할 수 없으므로, 다른 사이트에서 자동 제출된 폼으로 로그아웃당하는 것을 막을 수 있다.
 * 헤더가 하나도 없으면(구형 클라이언트·직접 만든 요청) 안전한 쪽으로 거절한다.
 * 근거: docs/AuthSpec.md 4.1.
 */
export const isSameOriginRequest = (request: Request): boolean => {
  const origin = request.headers.get('origin');

  if (origin) {
    return origin === new URL(request.url).origin;
  }

  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite) {
    return SAME_ORIGIN_FETCH_SITES.includes(fetchSite.toLowerCase());
  }

  return false;
};
