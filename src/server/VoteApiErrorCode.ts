/** 투표·피드백 API 가 돌려주는 오류 코드. 응답 본문은 `{ error: VoteApiErrorCode }` 형태다. */
export enum VoteApiErrorCode {
  /** 목 데이터 모드라 서버 투표를 쓸 수 없다. */
  SERVER_VOTE_DISABLED = 'SERVER_VOTE_DISABLED',
  ISSUE_NOT_FOUND = 'ISSUE_NOT_FOUND',
  CLAIM_NOT_FOUND = 'CLAIM_NOT_FOUND',
  INVALID_BODY = 'INVALID_BODY',
}
