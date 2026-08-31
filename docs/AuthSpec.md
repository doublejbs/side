# 로그인 스펙 (Supabase Auth · Google · 카카오)

> 결정(2026-08-30): 투표·근거 피드백은 **로그인 필수**. 인증은 Supabase Auth, 수단은 Google·카카오 OAuth. 기존 익명(쿠키) 투표는 첫 로그인 시 계정으로 이전.
> 배경: 익명 쿠키 방식은 기기 간 동기화·중복 투표 방어·"나 탭" 누적 계산이 불가능했다.

## 1. 아키텍처

- 패키지: `@supabase/supabase-js`, `@supabase/ssr`
- 세션: `@supabase/ssr`의 쿠키 기반 세션. 서버 컴포넌트/라우트 핸들러는 `createServerClient`(cookies), 클라이언트는 `createBrowserClient`. `src/proxy.ts`에서 매 요청 세션 갱신(`supabase.auth.getUser()` — 만료 토큰 리프레시) 후 기존 `/admin` 보호 로직 수행.
- 사용자 식별자: Supabase `auth.users.id`(UUID)를 그대로 `userId`로 사용. 앱 DB에 `User` 테이블은 두지 않는다(프로필 표시는 세션의 `user_metadata`(이름·아바타)로 충분).
- 관리자(`/admin`)는 **기존 비밀번호 방식 유지**(변경 없음). 추후 이메일 허용 목록으로 전환 가능.

## 2. 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
```
Vercel(Production·Preview)·`.env`·GitHub Actions에는 불필요(파이프라인은 인증 안 씀).

Supabase 대시보드 설정(Authentication):
- Providers: **Google**(Client ID/Secret — Google Cloud OAuth 클라이언트, 승인된 리디렉션 URI `https://<ref>.supabase.co/auth/v1/callback`), **Kakao**(REST API 키 = Client ID, Client Secret 활성화 — Kakao Developers, Redirect URI 동일, 동의 항목: 프로필(닉네임·사진), 카카오계정(이메일) 선택)
- URL Configuration: Site URL `https://side-puce.vercel.app`, Redirect URLs `https://side-puce.vercel.app/**`, `https://*-jins-projects-33ecbd26.vercel.app/**`, `https://localhost:3210/**`

## 3. 데이터 모델 (마이그레이션 `0004_vote_user`)

```prisma
model Vote {
  // 기존 필드 유지, 변경:
  anonId String?                 // 이전(legacy) 익명 식별자 — 이전 후 null
  userId String?                 // Supabase auth.users.id
  @@unique([issueId, anonId])    // 유지(legacy)
  @@unique([issueId, userId])    // 추가
  @@index([userId])
}
model ClaimFeedbackRecord {
  anonId String?
  userId String?
  @@unique([claimId, anonId])
  @@unique([claimId, userId])
}
```
- 집계(`aggregateVotes`)는 `userId IS NOT NULL OR anonId IS NOT NULL` 전부 포함(이전 전 익명 표도 여론에 남긴다).
- **새 투표는 항상 `userId`로만 저장**. `anonId` 신규 발급 중단(쿠키 발급 코드 제거, 읽기는 이전용으로 유지).

## 4. 흐름

### 4.1 로그인 `/login`
- `LoginPageView`: SIDE 로고, 한 줄 설명("의견을 남기려면 로그인이 필요해요. 어떤 정치적 입장도 저장하지 않으며, 투표 기록은 나에게만 보입니다."), 버튼 2개(Google · 카카오 — 브랜드 가이드 준수 색, 동일 크기), `?next=` 파라미터(내부 경로만 허용, 기본 `/`).
- 클라이언트: `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${origin}/auth/callback?next=${next}` } })`.
- `GET /auth/callback`(route handler): `exchangeCodeForSession(code)` → 성공 시 **익명 투표 이전(4.3)** 실행 → `next`로 redirect. 실패 시 `/login?error=1`.
- `POST /auth/signout`(route handler): `Origin`(없으면 `Sec-Fetch-Site`)으로 동일 출처인지 먼저 확인하고, 교차 출처면 로그아웃하지 않고 `403`. 통과하면 `supabase.auth.signOut()` 후 `303 /`(legacy `side_anon` 쿠키도 함께 삭제).

### 4.2 투표·피드백 게이트
- `POST /api/issues/[slug]/votes`, `POST /api/claims/[id]/feedback`: 세션 없으면 `401 { error: 'LOGIN_REQUIRED' }`. 있으면 `userId`로 upsert.
- `GET /api/issues/[slug]/votes/me`: 세션 없으면 `myChoice: null` + 분포(로그인 안 해도 결과는 볼 수 있음).
- `VotePanelView`: 비로그인 시 버튼 3개는 그대로 보이되 클릭 → `/login?next=/issues/[slug]#vote`로 이동(선택은 저장하지 않음; 안내 문구 "투표하려면 로그인이 필요해요"). 로그인 시 기존 동작.
- `ClaimFeedbackView`: 동일 게이트.
- `isServerVoteEnabled`는 유지(목 모드에서는 게이트 없이 localStorage — 개발 편의).
- 결과 화면(`/result`): 비로그인이면 "내 선택" 배지 없이 분포만 표시 + "로그인하고 투표하기" 링크.

### 4.3 익명 투표 이전
- `migrateAnonVotes(userId, anonId)`(`src/server/migrateAnonVotes.ts`, VoteStore 메서드 `claimAnonRecords(anonId, userId)`): 트랜잭션으로 `Vote`/`ClaimFeedbackRecord`의 `anonId = ?`를 `userId = ?, anonId = null`로 변경. 같은 이슈에 계정 투표가 이미 있으면 익명 표는 **삭제**(계정 표 우선). 완료 후 `side_anon` 쿠키 삭제.
- 로그인 콜백에서 1회 실행. 실패해도 로그인은 성공 처리(로그만).

### 4.4 화면
**세션은 클라이언트에서 로드해 공개 페이지 정적 렌더를 유지한다.** 페이지(서버 컴포넌트)가 `getSessionUser()`를 부르면 `cookies()`를 읽게 되어 `/`·`/discover`·`/me`·`/issues/**`가 전부 요청별 동적 렌더로 바뀌고, ISR(`revalidate = 60`)과 승인 시 `revalidatePath`가 무력화된다. 그래서 세션 판정은 경량 라우트 `GET /api/session`(`SessionUser | null`, `Cache-Control: no-store`) 하나로 모으고, 화면은 `useSessionUser()`로 읽는다. 훅은 `SessionCache`(모듈 스코프 + `useSyncExternalStore`)에 앱 수명 동안 한 번만 받아온 결과를 담고 `{ user, isLoaded }`를 돌려주며, `isAuthEnabled()`가 false면 요청 없이 `{ user: null, isLoaded: true }`다. 공개 페이지의 `page.tsx`는 `getSessionUser()`를 부르지 않는다(로그인 페이지 `/login`만 "이미 로그인이면 redirect" 때문에 동적이어도 무방하다).

- `AppHeaderView` 액션 슬롯(`authAction`): 비로그인 → "로그인" 링크(44px 터치 영역, `buildLoginHref(현재 탭)`), 로그인 → 아바타(없으면 이름 이니셜 원) 클릭 시 `/me`. `AuthActionContainer`(client)가 `useSessionUser()`로 세션을 읽어 `AuthActionView`에 `SessionUser | null`을 넘기고, 로드 전에는 같은 크기의 자리만 잡아 헤더가 흔들리지 않게 한다. `isAuthEnabled()`가 false면 페이지가 액션 자체를 넘기지 않는다. 홈·발견·나 탭에 적용(검색·설정 버튼 오른쪽).
- 로그인 게이트가 걸리는 컨테이너(`VotePanelContainer`·`ClaimFeedbackContainer`·`VoteResultContainer`·`MostDifferentIssueContainer`·`SimilarGroupContainer`)는 `useSessionUser()`로 직접 판정하고, `loginHref`만 props로 받는다(서버가 slug로 계산). 세션 판정 전(`isLoaded === false`)에는 선택지를 로그인 링크로 바꾸지 않고 `disabled`·`aria-busy` 상태로 둔다.
- 게이트는 **서버 모드에서만** 작동한다. 목 모드(`isServerEnabled === false`)는 로그인 없이 localStorage에 기록한다(개발 편의).
- API가 `401`을 주면 `VoteApiClient`가 `LoginRequiredError`를 던지고, `useVote`·`useClaimFeedback`이 `isLoginRequired`로 구분해 돌려준다. 컨테이너는 저장 실패 문구 대신 로그인 링크를 렌더한다.
- `/me`: 페이지는 정적으로 두고 `MePageContainer`(client)가 세션을 읽어 본문을 고른다. 서버는 목 데이터와 이슈 조회 결과(질문·주장 제목)를 props로 내려준다. 로그인 시 상단에 계정 카드(`AccountCardView` — 아바타·이름·이메일·`<form action="/auth/signout" method="post">` 로그아웃 버튼) + 기존 섹션, 비로그인 시 `LoginRequiredView`(로그인 안내 카드 + 로그인 버튼)만 렌더하고 정치 관점·의견 변화 목 데이터는 감춘다.
- **"나의 참여 · 투표한 이슈" 수는 서버 모드에서 `userId` 기준 서버 집계를 쓴다(구현 완료).** `ParticipationTilesContainer` 가 `useMyVotes(isServerEnabled)` 로 `GET /api/me/votes` 결과를 읽어 `votes?.length ?? 0` 을 보여준다(비로그인이면 0). 집계가 오기 전(`isLoaded === false`)에는 0 을 그리지 않고 `aria-busy` 자리만 잡는다. 목 모드(`isServerEnabled === false`)에서만 localStorage 기록(`useUserVotes`)을 쓴다 — 그 훅은 이제 목 모드 전용 집계원이다.
- `/discover`: "당신과 가장 다른 의견"·"내 생각과 비슷한 그룹"은 내 투표에 기대므로, 로그인이 켜져 있고 세션이 없으면 카드 대신 안내 문구 + 로그인 링크를 보여준다. 판정은 두 섹션 컨테이너가 `useSessionUser()`로 하고 페이지는 `loginHref`만 넘긴다(`/me`와 같은 원칙 — 페이지는 정적, 세션은 클라이언트). 서버 집계(userId) 전환도 구현 완료다 — 두 컨테이너는 서버 모드에서 `useMyVotes(isServerEnabled)` 결과를 쓰고, 목 모드에서만 localStorage 기록을 쓴다. 서버 모드에서 집계가 오기 전에는 "투표한 이슈가 없다"고 단정하지 않고 `aria-busy` 자리만 잡는다(`VoteResultContainer` 의 세션 게이트와 같은 원칙). 두 입력은 `toVoteChoiceBySlug`(서버) / `toVoteChoiceBySlugFromRecords`(목)로 같은 `Map<slug, VoteChoice>` 형태로 맞춰 `pickMostDifferentIssue` 에 넘긴다.
- **내 투표 서버 집계**: `GET /api/me/votes`(비로그인 `401 LOGIN_REQUIRED`, `Cache-Control: no-store`)를 `MyVotesCache`(모듈 스코프 + `useSyncExternalStore`)가 한 번만 부르고 `useMyVotes(isServerEnabled)`가 `{ votes, isLoaded }`를 돌려준다. 서버 모드이고 세션이 **로그인으로 확인된 뒤에만** 요청한다 — 목 모드·비로그인·로그인 비활성은 요청 없이 `{ votes: null, isLoaded: true }` 다.
  - **실패 처리**: `401` 은 로그인이 끊긴 것이므로 재시도하지 않고 `votes: null` 로 확정하며, 세션 캐시도 `invalidateSession()` 으로 비워 다음 마운트에서 다시 확인한다. 그 밖의 실패(비-OK 응답·네트워크 오류)는 요청 표시를 되돌려 **다음 마운트에서 다시 시도**하고, 이미 받아 둔 목록은 지우지 않는다(성공한 적이 없을 때만 `votes: null` 로 확정한다).
  - 요청마다 순번을 매겨 **늦게 도착한 옛 응답은 버린다**(무효화로 새 요청이 겹칠 수 있다).
  - 투표가 저장되면(`castVoteRequest` 성공) `invalidateMyVotes()` 가 요청 표시를 지우고, 구독 중인 화면이 있으면 **바로 다시 받아온다**(상주 소비자의 카운트가 그 자리에서 N+1 이 된다). 마지막 목록은 남겨 화면이 깜빡이지 않는다.
  - `isServerEnabled` 는 기존 흐름대로 페이지(서버 컴포넌트)가 `isServerVoteEnabled()` 로 판정해 컨테이너에 내려주고, 컨테이너가 훅 인자로 그대로 넘긴다.
- 관리자 목록에 변화 없음.
- **렌더링 비용**: 세션을 클라이언트에서 읽으므로 로그인을 켜도 공개 화면(`/`·`/discover`·`/me`·`/issues/**`)은 ISR 정적 렌더로 남는다(`.next/prerender-manifest.json`의 `initialRevalidateSeconds: 60`으로 확인). 세션을 읽는 동적 경로는 `GET /api/session`·`GET /api/me/votes`·투표 API·`/login`뿐이다.

### 4.5 화면 구조
```
src/app/login/page.tsx                        // searchParams.next 검증 · 로그인 상태면 next 로 redirect
src/components/auth/LoginPageView.tsx         // 로고 · 안내 문구 · 오류 안내 · 버튼 영역
src/components/auth/OAuthLoginContainer.tsx   // 'use client' — signInWithOAuth 시작
src/components/auth/OAuthButtonView.tsx       // 52px 동일 크기 버튼 (브랜드 색은 hex 예외)
src/components/auth/GoogleMarkIcon.tsx, KakaoMarkIcon.tsx
src/components/auth/AuthActionView.tsx        // 헤더 액션 슬롯(순수 뷰)
src/components/auth/AuthActionContainer.tsx   // 'use client' — useSessionUser 로 세션을 읽어 뷰에 주입
src/components/auth/AccountCardView.tsx       // /me 계정 카드
src/components/auth/LoginRequiredView.tsx     // /me 비로그인 안내
src/components/auth/LoginErrorView.tsx        // 로그인 실패 안내(콜백 ?error=1 · 시작 실패 공용)
src/components/auth/getUserInitial.ts         // 아바타가 없을 때 쓰는 한 글자
src/components/result/LoginToVoteView.tsx     // 결과 화면 비로그인 CTA
src/components/me/MeHeaderView.tsx            // /me 헤더(설정 + 인증 액션)
src/components/me/MePageContainer.tsx         // 'use client' — /me 본문(비로그인 안내 / 계정 카드 + 기존 섹션)
src/store/LoginRequiredError.ts               // 401 을 화면이 구분할 수 있게 하는 오류 타입
src/store/SessionCache.ts                     // 모듈 스코프 세션 캐시(/api/session 1회 조회 + invalidateSession)
src/store/useSessionUser.ts                   // { user, isLoaded } — 클라이언트 세션 판정
src/store/MyVotesCache.ts                     // 모듈 스코프 내 투표 캐시(/api/me/votes 1회 조회 + invalidateMyVotes·요청 순번)
src/store/useMyVotes.ts                       // useMyVotes(isServerEnabled) → { votes, isLoaded }
src/components/discover/toVoteChoiceBySlug.ts // 서버 집계·목 모드 기록을 Map<slug, VoteChoice> 로 맞추는 변환
```
- 두 공급자 버튼의 색(Google `#ffffff`/`#dadce0`, 카카오 `#FEE500`/`#191919`)과 브랜드 마크 색은 각 사의 브랜드 가이드가 정한 값이라 디자인 토큰 규칙의 예외다. 해당 CSS·아이콘 파일에 주석으로 근거를 남긴다.

## 5. 서버 구조

```
src/domain/SessionUser.ts                        // { id, email, name, avatarUrl }
src/domain/AuthProvider.ts                       // enum GOOGLE, KAKAO

src/lib/supabase/getSupabaseEnv.ts               // getSupabaseEnv(): SupabaseEnv | null
src/lib/supabase/createServerSupabaseClient.ts   // (): Promise<SupabaseClient | null> — cookies() 기반
src/lib/supabase/createBrowserSupabaseClient.ts  // (): SupabaseClient | null — 'use client'
src/lib/supabase/getSessionUser.ts               // (): Promise<SessionUser | null> — user_metadata 매핑
src/lib/supabase/updateSupabaseSession.ts        // (request): Promise<NextResponse> — proxy 세션 갱신
src/lib/auth/isAuthEnabled.ts                    // (): boolean — NEXT_PUBLIC 두 개가 있는지
src/lib/auth/buildLoginHref.ts                   // buildLoginHref(next), sanitizeNextPath(value)
src/lib/auth/AuthGateway.ts                      // interface AuthGateway + createSupabaseAuthGateway()

src/server/migrateAnonVotes.ts                   // migrateAnonVotes({ store, anonCookieValue, secret, userId })
src/server/handleAuthCallback.ts                 // handleAuthCallback(deps) — 콜백 순수 로직
src/server/handleSignOut.ts                      // handleSignOut(deps) — 로그아웃 순수 로직(403/303)
src/server/isSameOriginRequest.ts                // isSameOriginRequest(request) — 교차 출처 POST 차단(CSRF)
src/server/anonCookie.ts                         // ANON_COOKIE_NAME, verifyAnonId, getAnonCookieSecret
src/testing/FakeAuthGateway.ts                   // 테스트용 AuthGateway 대역

src/app/auth/callback/route.ts                   // GET /auth/callback?code=&next=
src/app/auth/signout/route.ts                    // POST /auth/signout → 303 / (교차 출처면 403)
src/app/api/session/route.ts                     // GET /api/session → SessionUser | null (no-store)
src/app/api/me/votes/route.ts                    // GET /api/me/votes → { votes: MyVote[] } (401 비로그인, no-store)
src/domain/MyVote.ts                             // { slug, choice, votedAt }
src/app/login/page.tsx, src/components/auth/LoginPageView.tsx, OAuthButtonView.tsx, AccountCardView.tsx
```

시그니처
- `SessionUser { id: string; email: string | null; name: string | null; avatarUrl: string | null }`
- `AuthGateway { exchangeCode(code: string): Promise<{ userId: string } | null>; signOut(): Promise<void> }`
- `sanitizeNextPath(value: string | null | undefined): string` — 내부 절대 경로만 허용, 그 밖은 `/`. 거부 목록이 아니라 **파싱 후 origin 확인 allowlist**다: 제어문자를 포함하거나 `/`로 시작하지 않거나 `\`가 있으면 `/`, `new URL(value, 'https://side.invalid')`의 origin 이 base 와 다르면 `/`, 통과하면 `pathname + search + hash` 를 돌려준다(`/%0A/evil.com` 같은 제어문자 우회 차단).
- `buildLoginHref(next: string): string` → `/login?next=<encodeURIComponent(sanitized)>`
- `handleAuthCallback({ code, next, gateway, store, secret, anonCookieValue })` → `{ redirectTo, clearAnonCookie }`
- `handleSignOut({ gateway, isSameOrigin })` → `{ status, redirectTo, clearAnonCookie }` — 교차 출처면 `signOut()` 없이 403.
- `isSameOriginRequest(request: Request): boolean` — `Origin` 이 요청 origin 과 같거나, `Origin` 이 없고 `Sec-Fetch-Site` 가 `same-origin`·`none` 일 때만 true.
- `migrateAnonVotes({ store, anonCookieValue, secret, userId })` → `{ clearCookie, votes, feedbacks }`

`VoteStore` 시그니처: `castVote(issueId, userId, choice)`, `getMyVote(issueId, userId)`, `listMyVotes(userId): Promise<MyVoteRow[]>`(`{ issueSlug, choice, votedAt }` — **발행된 이슈의 표만**, `updatedAt` 내림차순. Prisma 는 `issue: { status: PUBLISHED }` 조건으로 걸러 slug 를 함께 읽고, 인메모리는 시드에 없는 이슈 id 를 미발행으로 다뤄 뺀다), `setClaimFeedback(claimId, userId, feedback)`, `getMyClaimFeedback(claimId, userId)`, `claimAnonRecords(anonId, userId): Promise<{ votes; feedbacks }>`. 인메모리 구현도 동일하며, 이전 시나리오를 만들기 위한 `seedAnonVote`/`seedAnonClaimFeedback` 을 테스트 전용으로 둔다.

`voteHandlers` 는 쿠키 대신 `sessionUser: SessionUser | null` 을 주입받는다. 쓰기 핸들러는 비로그인이면 `401 { error: 'LOGIN_REQUIRED' }`(`VoteApiErrorCode.LOGIN_REQUIRED`), `handleGetMyVote` 는 `myChoice: null` + 분포를 돌려준다. `handleListMyVotes({ store, sessionUser })` 는 비로그인이면 401, 로그인이면 `{ votes: MyVote[] }` 를 돌려주며 스토어가 이미 거른 뒤 남은 slug 없는 표도 뺀다. 익명 쿠키 신규 발급 코드는 제거했고(`readOrCreateAnonId`·`buildAnonCookie` 삭제), 이전용 읽기(`verifyAnonId`)만 남았다. `isServerVoteEnabled`/`getServerVoteContext` 는 그대로다(`secret` 은 익명 표 이전 검증에 쓴다).

`proxy.ts` 는 `updateSupabaseSession` 으로 매 요청 세션을 갱신한 뒤 기존 `/admin` 보호를 수행한다. matcher 는 정적 확장자까지 제외한 `'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'` 이다(이미지·robots 류에 세션 갱신을 붙이지 않는다). `getSessionUser` 는 React `cache()` 로 감싸 한 요청 안에서 Supabase 왕복을 한 번만 한다.

`useVote`/`useClaimFeedback` 은 인증 여부를 모른다. 게이트 판정은 컨테이너가 `useSessionUser()` 로 하고, 훅은 서버가 401 을 주면 `isLoginRequired` 로 알리며 **낙관적으로 쓴 localStorage 기록을 이전 값으로 롤백**한다(로그인이 필요해 거절된 표는 로컬에도 남기지 않는다).

## 6. 테스트
- 라우트 핸들러: 비로그인 401, 로그인 upsert(userId), `votes/me` 비로그인 분포만.
- `migrateAnonVotes`: 이전·충돌 시 삭제·쿠키 삭제.
- `VotePanelView`: 비로그인 렌더(버튼 → 로그인 링크), 로그인 렌더.
- `LoginPageView`: 버튼 2개, `next` 검증(외부 URL 거부).
- `/me` 비로그인 안내.
- Supabase 클라이언트는 서버에서 필요한 동작만 추린 인터페이스(`AuthGateway { exchangeCode(code): Promise<{ userId } | null>; signOut(): Promise<void> }`) 뒤에 두고 테스트는 가짜 구현(`FakeAuthGateway` — `userId`·`shouldThrow` 옵션으로 교환·로그아웃 실패를 만든다). 브라우저의 `signInWithOAuth` 는 `createBrowserSupabaseClient` 를 모킹해 검증한다.
- `sanitizeNextPath`: 제어문자(`%09`·`%0A`·`%0D`) 우회, `//evil`, `/\evil`, `javascript:` 거부와 정상 경로·쿼리·해시 유지.
- `getSessionUser`: Google·카카오 형태 `user_metadata` 에서 이름·아바타 매핑.
- `useSessionUser`: 로그인이 꺼져 있으면 요청 없음, 마운트 시 `/api/session` 1회 조회, 실패 시 비로그인.
- `handleListMyVotes`: 비로그인 401, 내 표만 최근 순, 미발행 이슈의 표 제외. `listMyVotes`: 인메모리·Prisma 두 구현 모두 최근 순·slug 매핑, 미발행 이슈 제외.
- `useMyVotes`: 목 모드·로그인 비활성·비로그인이면 요청 없음, 로그인 확인 뒤 `/api/me/votes` 1회 조회. 401 은 재시도 없음(세션도 무효화), 그 밖의 실패는 다음 마운트에서 재시도하고 기존 목록 보존, 늦게 온 옛 응답 폐기. `castVoteRequest` 성공 뒤 구독 중인 화면의 목록이 바로 갱신.
- 세 컨테이너(`ParticipationTilesContainer`·`MostDifferentIssueContainer`·`SimilarGroupContainer`): 집계 로드 전에는 0·"투표 없음" 을 그리지 않고, 도착하면 서버 집계로, 목 모드에서는 localStorage 기록으로 그린다.
- `handleSignOut`·`isSameOriginRequest`: 교차 출처 403(로그아웃 미호출), 동일 출처 303 + `clearAnonCookie`.
- `useVote`·`useClaimFeedback`: 401 이면 localStorage 롤백, 500 이면 로컬 기록 유지.

## 7. 범위 밖
이메일 매직링크, 네이버 로그인(Supabase 미지원), 계정 삭제 UI(Supabase 대시보드로), 관리자 이메일 허용 목록.
