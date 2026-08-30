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
- `POST /auth/signout`(route handler 또는 서버 액션): `supabase.auth.signOut()` → `/`.

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
- `AppHeaderView` 액션 슬롯: 비로그인 → "로그인" 링크(`/login`), 로그인 → 아바타(또는 이니셜) + 메뉴 없이 클릭 시 `/me`.
- `/me`: 상단에 계정 카드(아바타·이름·이메일·로그아웃 버튼). "나의 참여" 타일의 투표 수는 **서버 집계(userId 기준)**로 대체. 비로그인 시 `/me`는 로그인 안내 카드 + 로그인 버튼(정치 관점·의견 변화 목 데이터는 로그인 후에만 표시).
- `/discover`: "당신과 가장 다른 의견" 등 내 투표 의존 섹션은 서버 집계(userId) 기준; 비로그인이면 안내.
- 관리자 목록에 변화 없음.

## 5. 서버 구조

```
src/lib/supabase/createServerSupabaseClient.ts   // cookies() 기반, 서버 컴포넌트·라우트 공용
src/lib/supabase/createBrowserSupabaseClient.ts  // 'use client'
src/lib/supabase/getSessionUser.ts               // { id, email, name, avatarUrl } | null (user_metadata 매핑)
src/server/requireSessionUser.ts                 // 라우트에서 401 응답 헬퍼
src/server/migrateAnonVotes.ts
src/app/login/page.tsx, src/components/auth/LoginPageView.tsx, OAuthButtonView.tsx, AccountCardView.tsx
src/app/auth/callback/route.ts, src/app/auth/signout/route.ts
src/domain/AuthProvider.ts (enum GOOGLE, KAKAO)
```
- `VoteStore` 시그니처: `castVote(issueId, userId, choice)`, `getMyVote(issueId, userId)`, `setClaimFeedback(claimId, userId, …)`, `claimAnonRecords(anonId, userId)`. 인메모리 구현 동일 갱신.
- `useVote`/`useClaimFeedback`: `isAuthenticated` 옵션 추가. 비인증이면 `castVote` 대신 `loginHref` 반환.

## 6. 테스트
- 라우트 핸들러: 비로그인 401, 로그인 upsert(userId), `votes/me` 비로그인 분포만.
- `migrateAnonVotes`: 이전·충돌 시 삭제·쿠키 삭제.
- `VotePanelView`: 비로그인 렌더(버튼 → 로그인 링크), 로그인 렌더.
- `LoginPageView`: 버튼 2개, `next` 검증(외부 URL 거부).
- `/me` 비로그인 안내.
- Supabase 클라이언트는 인터페이스(`AuthGateway { getUser(); signInWithOAuth(); signOut(); exchangeCode() }`) 뒤에 두고 테스트는 가짜 구현.

## 7. 범위 밖
이메일 매직링크, 네이버 로그인(Supabase 미지원), 계정 삭제 UI(Supabase 대시보드로), 관리자 이메일 허용 목록.
