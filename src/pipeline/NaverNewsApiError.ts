/** 네이버 뉴스 검색 API 호출 실패. 재시도 여부 판단을 위해 HTTP 상태를 함께 담는다. */
export class NaverNewsApiError extends Error {
  readonly status: number;

  readonly body: string;

  constructor(status: number, body: string) {
    super(`네이버 뉴스 API 호출 실패 (status ${status}): ${body}`);
    this.name = 'NaverNewsApiError';
    this.status = status;
    this.body = body;
  }
}
