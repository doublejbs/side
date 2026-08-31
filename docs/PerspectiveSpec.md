# 나 탭 실제 계산 스펙 (정치 관점 5축 · 의견 변화)

> 목표: `src/data/perspectiveData.ts`의 목 데이터를 사용자 본인의 투표 기록 기반 계산으로 대체한다.
> 원칙(브리프 19장): 축 값은 **성향 라벨이 아니라 내가 선택한 이슈 패턴의 시각화**다. 서버는 개인 축 값을 저장하지 않고 요청 시 계산만 한다(프로필 축적 금지).

## 1. 이슈 축 메타데이터

- `Issue.axes Json?` — `IssueAxis[]`, 0~2개.
  ```ts
  // src/domain/IssueAxis.ts
  enum AxisDirection { LEFT = 'LEFT', RIGHT = 'RIGHT' }   // PerspectivePoint의 leftLabel/rightLabel 방향
  interface IssueAxis { axis: PerspectiveAxis; agreeDirection: AxisDirection }
  ```
- 축 정의(고정, `src/domain/perspectiveAxisLabels.ts`): 경제(시장 중심|정부 역할), 복지(개인 책임|사회 책임), 노동(기업 중심|노동자 중심), 환경(성장|환경), 외교(현실주의|이상주의). LEFT=왼쪽 라벨.
- 생성: `classify`(nano) 출력에 `axes` 추가 — "이 질문에 찬성하는 것이 어느 축의 어느 방향인지, 해당 없으면 빈 배열. 확신 없으면 넣지 않는다." zod: 축 중복 금지.
- 검수: 관리자 검수 폼에 축 편집(축 select + 방향 select, 최대 2행). 승인 전 확인 대상.
- 시드 5이슈 수동 지정: 주4.5일제(노동, AGREE→RIGHT 노동자 중심), 원전(환경, AGREE→LEFT 성장), 정년연장(노동, AGREE→RIGHT), AI규제(경제, AGREE→RIGHT 정부 역할), 보유세(경제, AGREE→RIGHT / 복지, AGREE→RIGHT 사회 책임).

## 2. 투표 변경 이력

- `VoteEvent` 테이블(마이그레이션 0005): `id, issueId, userId, choice, createdAt`. `@@index([userId, issueId, createdAt])`.
- `PrismaVoteStore.castVote`: upsert 후 **선택이 바뀌었거나 신규일 때만** `voteEvent.create`(같은 선택 재클릭은 기록 안 함). InMemory 동일. 익명 이전(`claimAnonRecords`) 시 이벤트는 만들지 않음(과거 이력 없음).
- 정리 정책 없음(MVP).

## 3. 계산 (`src/domain/computePerspective.ts`, 순수 함수)

- 입력: `Array<{ axes: IssueAxis[]; choice: VoteChoice }>`(내 최신 표), 출력: `PerspectivePoint[]`(축 5개 전부).
- 축별: 표 하나가 `agreeDirection` 방향(찬성) 또는 반대 방향(반대)으로 1점. UNSURE·축 없음은 제외. `value = 50 + 50 * (right - left) / (right + left)` (0~100, 소수 반올림). 표 0개인 축은 `value: null`.
- `PerspectivePoint`에 `value: number | null`, `voteCount: number` 추가(기존 인터페이스 확장 — 목 데이터도 voteCount 부여).

## 4. API `GET /api/me/perspective` (로그인 필수 401)

응답:
```ts
interface MyPerspectiveResponse {
  points: PerspectivePoint[];            // 5축 전부(voteCount 0이면 value null)
  changes: MyOpinionChange[];            // 최신순 최대 5
  feedbackCount: number;                 // 내 근거 피드백 수
}
interface MyOpinionChange { slug: string; question: string; before: VoteChoice; beforeAt: string; after: VoteChoice; afterAt: string; persuadedClaimTitle: string | null }
```
- `changes`: `VoteEvent`에서 같은 이슈의 연속 이벤트 중 선택이 바뀐 쌍(발행 이슈만). `persuadedClaimTitle`: 그 이슈 주장 중 내가 PERSUADED 피드백을 남긴 첫 주장 제목(없으면 null).
- `VoteStore`에 `listMyVoteEvents(userId)`, `listMyPersuadedClaims(userId)`(claimId·title·issueId), `countMyClaimFeedbacks(userId)` 추가. 계산은 핸들러 순수 함수(`handleMyPerspective`).
- `Cache-Control: no-store`.

## 5. 나 탭 화면

- 서버 모드 + 로그인: `useMyPerspective`(MyVotesCache 패턴, 투표·피드백 성공 시 무효화 — `invalidateMyVotes`와 함께 `invalidateMyPerspective` 호출)로 로드.
  - 축 카드: `value === null`인 축은 마커 없이 트랙만 + "아직 이 분야 투표가 없어요" 12px muted. 카드 상단 안내 문구 유지 + "내 투표 N개 기준".
  - "내 생각이 바뀐 이슈": `changes`가 있으면 실제 데이터(질문·before→after·시점·설득 주장), 없으면 "생각이 바뀐 기록이 아직 없어요" 카드. 목 `OPINION_CHANGES`는 서버 모드에서 사용 안 함.
  - 참여 타일: 투표한 이슈(기존 `useMyVotes`), **근거 피드백**(`feedbackCount` — 기존 "읽은 근거 42" 대체, 라벨 변경), 바뀐 생각(`changes.length`).
- 비로그인·목 모드: 기존 동작(목 데이터) 유지.
- 발견 탭은 이번 범위 밖.

## 6. 테스트

`computePerspective`(방향·비율·null 축·UNSURE 제외), `IssueAxis` zod, classify axes 출력·저장, castVote 이벤트 기록 규칙(신규/변경만), `handleMyPerspective`(401·changes 쌍 구성·persuaded 연결·feedbackCount), 관리자 축 편집 저장, 나 탭 렌더(값 null 축·빈 변화·타일), 시드 axes.

## 7. 범위 밖

발견 탭 연동, 축 가중치, 이력 기반 그래프, 익명 표의 축 계산.
