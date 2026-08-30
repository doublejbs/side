# SIDE MVP 구현 스펙

> 출처: `writing-block.md` 디자인 브리프. 디자인 방향은 **B · Modern Data** 채택.
> 디자인 캔버스: https://claude.ai/code/artifact/2f851667-5c96-4665-9bc2-bea05e973ca1

## 1. 범위

MVP는 **모바일 퍼스트 웹**(Next.js App Router)이며 백엔드 없이 **인메모리 목 데이터**로 동작한다. 사용자의 투표·피드백은 브라우저 `localStorage`에 저장한다.

### 화면 (브리프 28장)

| # | 화면 | 라우트 |
|---|---|---|
| 01 | 오늘의 이슈 홈 | `/` |
| 02 | 이슈 상세 (30초 요약 · 핵심 쟁점 · 찬반 주장 · 언론 관점 · 투표) | `/issues/[issueId]` |
| 03 | 근거 화면 (주장 카드 → 근거 목록) | `/issues/[issueId]/claims/[claimId]` |
| 04 | 투표 결과 + 의견 그룹 | `/issues/[issueId]/result` |
| 05 | 발견 탭 | `/discover` |
| 06 | 나 탭 (정치 관점 · 의견 변화) | `/me` |

브리프의 Screen 03(찬반 주장)과 Screen 04(언론 관점)는 이슈 상세 페이지의 섹션으로 구현한다(사용 시나리오가 하나의 스크롤 흐름이기 때문).

### 제외

- 댓글, 검색 동작(아이콘만 배치), 실제 그룹 클러스터링 알고리즘(그룹은 목 데이터).
- 로그인(Supabase Auth · Google/카카오)과 서버 투표는 이후 단계에서 추가했다. 스펙은 `docs/AuthSpec.md`.
- 근거 단위 피드백(이 정보가 중요해요 / 사실과 다른 것 같아요) UI — `EvidenceFeedback` enum만 선언하고 화면은 만들지 않는다.

## 2. 기술 스택

- Next.js 16 (App Router, `src/` 디렉토리), React 19, TypeScript strict
- 스타일: **CSS Modules** + `globals.css` 디자인 토큰 (Tailwind 미사용)
- 폰트: `next/font/google` IBM Plex Sans KR
- 테스트: Vitest + Testing Library (jsdom)
- Lint: eslint-config-next

## 3. 디자인 토큰 (Direction B)

| 토큰 | 값 |
|---|---|
| `--color-bg` | `#f4f5f7` |
| `--color-surface` | `#ffffff` |
| `--color-line` | `#e6e7eb` |
| `--color-line-soft` | `#eef0f4` |
| `--color-ink` | `#111318` |
| `--color-ink-2` | `#2a2d36` |
| `--color-muted` | `#6c7080` |
| `--color-muted-2` | `#8a8f9e` |
| `--color-brand` | `#3f4f7a` |
| `--color-agree` | `#4b7c6f` / tint `#eaf1ee` |
| `--color-disagree` | `#a0674d` / tint `#f3ebe6` |
| `--color-unsure` | `#b8bcc6` / tint `#eef0f4` |
| `--radius-card` | `20px` (카드) |
| `--radius-tile` | `14px` (카드 내부 소형 타일) |
| `--radius-control` | `12px` (버튼·아이콘 버튼) |
| 카드 | 흰 배경, 1px `--color-line`, 패딩 20px |
| 칩 | 11px/500, 5px 10px, radius 999 |
| 최대 콘텐츠 폭 | 480px 중앙 정렬 (데스크톱에서도 모바일 레이아웃 유지) |
| 최소 터치 타깃 | 44px |

찬성/반대 카드는 **같은 최소 높이 · 같은 서체 크기 · 같은 칩 구조**를 사용한다.

## 4. 도메인 모델

모든 문자열 유니언은 `enum`(string) 으로 별도 파일에 선언한다.

```ts
// src/domain/VoteChoice.ts
enum VoteChoice { AGREE = 'AGREE', DISAGREE = 'DISAGREE', UNSURE = 'UNSURE' }

// src/domain/ClaimSide.ts
enum ClaimSide { AGREE = 'AGREE', DISAGREE = 'DISAGREE' }

// src/domain/EvidenceType.ts
enum EvidenceType { FACT = 'FACT', RESEARCH = 'RESEARCH', EXPERT = 'EXPERT', CLAIM = 'CLAIM' }

// src/domain/MediaLeaning.ts
enum MediaLeaning { PROGRESSIVE = 'PROGRESSIVE', CENTRIST = 'CENTRIST', CONSERVATIVE = 'CONSERVATIVE' }

// src/domain/ClaimFeedback.ts
enum ClaimFeedback { PERSUADED = 'PERSUADED', NOT_PERSUADED = 'NOT_PERSUADED', LACKS_EVIDENCE = 'LACKS_EVIDENCE' }

// src/domain/EvidenceFeedback.ts
enum EvidenceFeedback { IMPORTANT = 'IMPORTANT', SEEMS_FALSE = 'SEEMS_FALSE' }

// src/domain/PerspectiveAxis.ts
enum PerspectiveAxis { ECONOMY = 'ECONOMY', WELFARE = 'WELFARE', LABOR = 'LABOR', ENVIRONMENT = 'ENVIRONMENT', DIPLOMACY = 'DIPLOMACY' }
```

```ts
// src/domain/Issue.ts (interface 들)
interface VoteDistribution { agree: number; disagree: number; unsure: number } // 퍼센트, 합 100
interface Issue {
  id: string; question: string; tags: string[]; participantCount: number;
  distribution: VoteDistribution; summary: string[]; sourceArticleCount: number;
  /** 언론 관점 비교에 사용한 매체 수와 기간 라벨('최근 2주' 등) */
  mediaOutletCount: number; coveragePeriodLabel: string;
  keyPoints: KeyPoint[]; claims: Claim[]; mediaPerspectives: MediaPerspective[];
  commonCoverage: string[]; opinionGroups: OpinionGroup[];
}
interface KeyPoint { id: string; title: string; question: string }
interface Claim { id: string; side: ClaimSide; title: string; description: string; persuadedCount: number; evidences: Evidence[] }
interface Evidence { id: string; type: EvidenceType; source: string; date: string /* YYYY.MM.DD */; summary: string; url: string }
interface MediaPerspective { leaning: MediaLeaning; articleCount: number; frame: string; keywords: string[]; representativeArticle: { title: string; source: string; url: string } }
interface OpinionGroup { id: string; label: string /* '그룹 A' */; share: number; description: string; agreesWith: string[] /* claimId */; disagreesWith: string[]; mostDivided: string[] }
```

```ts
// src/domain/IssueSummary.ts — 홈·발견·목록 API 에서 넘기는 경량 이슈 정보
interface IssueSummary { slug: string; question: string; participantCount: number; distribution: VoteDistribution; tags: string[] }

// src/domain/IssueResultSummary.ts — 투표 결과 화면으로 넘기는 경량 이슈 정보
interface ClaimSummary { id: string; side: ClaimSide; title: string; evidenceCount: number }
interface IssueResultSummary {
  slug: string; question: string; participantCount: number; distribution: VoteDistribution;
  claims: ClaimSummary[]; opinionGroups: OpinionGroup[];
}

// src/domain/OpinionGroupSummary.ts — 발견 화면 그룹 카드로 넘기는 경량 그룹 정보
interface OpinionGroupSummary { id: string; label: string; share: number; description: string }
```

`toIssueSummary` / `toIssueResultSummary` / `toOpinionGroupSummary` 변환 함수는 각 파일에 함께 둔다. 근거 원문·언론 관점·핵심 쟁점 같은 상세 데이터가 클라이언트 번들과 SSR HTML에 실리지 않게 하려는 목적이다.

```ts
// src/domain/UserRecord.ts
interface VoteRecord { issueId: string; choice: VoteChoice; votedAt: string /* ISO */ }
interface ClaimFeedbackRecord { claimId: string; feedback: ClaimFeedback }
interface PerspectivePoint { axis: PerspectiveAxis; leftLabel: string; rightLabel: string; value: number /* 0~100 */ }
interface OpinionChange { issueId: string; before: VoteRecord; after: VoteRecord; persuadedByClaimId: string }
```

## 5. 데이터 계층

- `src/data/issues/*.ts` — 이슈별 목 데이터 5건 (주 4.5일제, 원전, 정년 65세, AI 규제, 부동산 보유세). Lorem ipsum 금지, 브리프 샘플 수치 사용.
- `src/data/IssueRepository.ts` — 이슈 읽기 인터페이스. `listPublishedIssues()`, `getIssueBySlug(slug)`, `getClaimById(slug, claimId)`, `listSlugs()`, `listClaimParams()`. 모두 **비동기**이며 서버 컴포넌트에서 `await getIssueRepository().xxx()` 로 호출한다. 구현은 `MockIssueRepository`(목 데이터) / `PrismaIssueRepository`(DB) 두 벌이다(`docs/PipelineSpec.md` 6장).
  - `listClaimParams()` 는 근거 화면 `generateStaticParams` 가 쓰는 `{ slug, claimId }` 조합을 한 번에 돌려준다(이슈를 slug 마다 다시 읽지 않는다).
  - `PrismaIssueRepository` 는 피드백·기사 행을 전량 읽지 않는다. 설득됐어요 수는 `_count.feedbacks`(PERSUADED 필터), 원문 기사 수는 `_count.articles`, 매체 수는 `(issueId, publisher)` distinct 질의 1회로 센다.
- `src/data/perspectiveData.ts` — 나 탭 축 5개, 의견 변화 1건, 참여 요약(`PARTICIPATION_SUMMARY`).
- `src/store/UserRecordStore.ts` — `localStorage` 래퍼. 키는 `side:votes`, `side:claimFeedback` **두 개뿐이다**(서버 분포는 저장하지 않는다). SSR 안전(`typeof window` 가드). API: `getVote(issueId)`, `setVote(issueId, choice)`, `getClaimFeedback(claimId)`, `setClaimFeedback(claimId, feedback)`, `getAllVotes()`.
- `src/store/VoteResultCache.ts` — 서버가 집계한 분포를 담는 **모듈 스코프 메모리 저장소**(`useSyncExternalStore` 구독). 앱이 살아 있는 동안만 유지하므로 오래된 분포가 고착되지 않는다. 요청 순번(`nextVoteRequestSeq`)을 발행해, 늦게 도착한 조회 응답이 더 최근 투표 결과를 덮어쓰지 않게 한다.
- `src/store/useVote.ts` — 클라이언트 훅. `{ vote, isLoaded, serverResult, error, castVote }`. 내 선택은 localStorage 에, 서버 분포는 `VoteResultCache` 에 둔다. `error` 는 서버 저장·조회 실패이며 컨테이너가 인라인 안내로 보여준다.
- `src/store/useServerVoteSync.ts` — 결과 화면이 마운트될 때마다 `GET /votes/me` 로 분포를 다시 받아온다(초기 페인트는 서버 렌더 분포).
- `src/store/useUserVotes.ts` — 클라이언트 훅. 전체 투표 기록 맵을 구독한다(발견·나 탭).
- `src/store/useClaimFeedback.ts` — 클라이언트 훅. `{ feedback, isLoaded, error, toggleFeedback }`.

### 투표 반영 규칙

사용자가 투표하면 표시용 분포를 재계산한다. 퍼센트와 참여자 수로부터 표 수를 **최대 나머지 방식**으로 복원해 합이 항상 `participantCount`와 같게 만들고, 선택 항목에 1표를 더한 뒤 다시 최대 나머지 방식으로 퍼센트(합 100)를 만든다. 반환하는 `participantCount`는 복원 카운트의 합(= 기존 참여자 + 1)이다. (`src/domain/computeDistribution.ts` — 순수 함수, 단위 테스트 대상.)

## 6. 화면 명세

### 00 로그인 `/login`
- 로고 `SIDE`, 한 줄 안내, 공급자 버튼 2개(Google · 카카오 — 52px 동일 크기, 브랜드 가이드 색). `?next=`는 내부 절대 경로만 허용하고(`sanitizeNextPath`) 기본값은 `/`. 이미 로그인했으면 `next`로 보낸다.
- 콜백이 실패해 `?error=1`로 되돌아오면 실패 안내를 보여준다. Supabase 공개 환경 변수가 없으면 버튼 대신 "로그인이 설정되지 않았습니다"만 보여준다.
- 상세는 `docs/AuthSpec.md` 4.1·4.4.

### 01 홈 `/`
- 헤더: 공통 `AppHeaderView`(로고 `SIDE` + 우측 액션 슬롯) — 액션은 비활성 검색 아이콘(`HeaderActionButtonView`), 그 오른쪽에 인증 액션(`AuthActionView` — 비로그인 "로그인" 링크 / 로그인 아바타 → `/me`).
- Hero: 공통 `PageHeroView` — "오늘의 이슈" / "지금 사람들이 의견을 나누고 있는 질문들".
- 첫 카드는 대형(24px 질문, 태그 칩, 3분할 분포 바 10px, 퍼센트 3개, 참여자, "3분 만에 이해하기 →"), 나머지 카드는 컴팩트(18px).
- 카드 전체가 `/issues/[id]` 링크.
- 클라이언트·API 로 넘기는 경량 정보(`IssueSummary`)에는 참여자 수가 포함된다(`GET /api/issues` 응답도 같다).
- 하단 탭바 3개(이슈/발견/나), 현재 탭 강조.

### 02 이슈 상세 `/issues/[issueId]`
섹션 순서 = 사용 시나리오 순서:
1. 헤더(뒤로가기, 태그 칩)
2. 질문(30px) + 통계 타일 3개(참여 / 원문 기사 / 핵심 쟁점)
3. **30초 요약** 카드 + 링크가 아닌 안내 문구 "원문 기사 N개를 바탕으로 정리했어요"(muted 13px)
4. **왜 의견이 갈릴까요?** — 2×2 쟁점 카드(01~04)
5. **찬성하는 사람들은 이렇게 말해요** — ClaimCard × 3 (링크 → 근거 화면)
6. **반대하는 사람들은 이렇게 말해요** — 동일 구조 × 3
7. **언론은 어떻게 다르게 보도했을까요?** — 언론 관점 데이터가 없으면 섹션을 숨긴다. 있을 때는 서브텍스트 `{coveragePeriodLabel} · {mediaOutletCount}개 매체 · 분석 기사 {합}건`(상단 통계 타일의 "원문 기사"는 요약의 핵심 출처 수로, 서로 다른 값이다) + 진보/중도/보수 카드(기사 수, 주요 프레임, 키워드 칩, 대표 기사) + 브랜드색 "공통적으로 다룬 내용" 카드
8. **지금 당신의 생각은?** — 같은 크기 버튼 3개(찬성 / 아직 모르겠어요 / 반대). 투표 시 `/issues/[id]/result`로 이동. 이미 투표했다면 선택 표시 + "결과 보기" 링크.
   - **로그인 게이트(서버 모드 한정)**: 비로그인이면 버튼 3개가 같은 모습의 로그인 링크(`/login?next=/issues/[id]#vote`)가 되고 카드 하단에 "투표하려면 로그인이 필요해요"를 덧붙인다. 목 모드는 게이트 없이 localStorage에 기록한다. 근거: `docs/AuthSpec.md` 4.2.

존재하지 않는 id → `notFound()`.

### 03 근거 `/issues/[issueId]/claims/[claimId]`
- 헤더(`BackHeaderView`의 `title`에 이슈 질문 — 축약 없이 CSS ellipsis), 주장 제목·설명, 찬/반 라벨.
- 근거 목록: 타입 배지(`FACT`/`RESEARCH`/`EXPERT`/`CLAIM`), 출처, 날짜, 핵심 내용, "원문 보기"(외부 링크, `target=_blank rel=noopener`).
- 주장 피드백 버튼 3개: 설득됐어요 / 설득되지 않았어요 / 근거가 부족해요 (토글, localStorage 저장, 선택 강조).
- **로그인 게이트(서버 모드 한정)**: 비로그인이면 버튼 3개가 로그인 링크(`/login?next=/issues/[id]/claims/[claimId]#feedback`)가 되고 "피드백을 남기려면 로그인이 필요해요"를 덧붙인다.

### 04 투표 결과 `/issues/[issueId]/result`
- "N명이 의견을 남겼어요", 3개 가로 바(찬성/반대/아직 모르겠어요) + 퍼센트, 내 선택에 "내 선택" 배지.
- 바는 마운트 시 `scaleX` 0→1 keyframes 400ms로 채워진다(과도한 애니메이션 금지). `prefers-reduced-motion: reduce`에서는 애니메이션을 끈다.
- CTA 카드(브랜드색): "나와 다른 사람들은 왜 그렇게 생각할까요?" → 상세 페이지 반대 섹션 앵커(내가 찬성이면 `#disagree`, 반대면 `#agree`, 모름이면 `#agree`).
- **비슷한 생각을 가진 사람들**: 그룹 카드 3개, 첫 그룹에 "나와 가장 가까움" 배지. 그룹 카드 클릭 → 확장(동의하는 주장 / 반대하는 주장 / 가장 의견이 갈리는 주장 목록).
- 미투표 상태로 접근하면 상세 페이지의 투표 섹션으로 안내하는 카드 표시(`/issues/[id]#vote`).
- **비로그인(서버 모드)**: "내 선택" 배지 없이 분포만 보여주고 "로그인하고 투표하기" 링크(`/login?next=/issues/[id]#vote`)를 덧붙인다.

### 05 발견 `/discover`
- "당신과 가장 다른 의견" 카드: 내 선택 vs 전체 분포가 가장 다른 이슈(투표 기록 기준; 없으면 안내 문구).
- "의외로 의견이 갈리는 이슈": 찬반 차이가 가장 작은 이슈.
- "내 생각과 비슷한 그룹": 첫 이슈 그룹 A 재사용 + "참여한 N개 이슈 기반". 투표 기록이 없으면 그룹 카드 대신 안내 문구와 "이슈 보러 가기" 링크만 보여준다.
- 페이지는 서버 컴포넌트다. localStorage 투표에 의존하는 부분(`MostDifferentIssueContainer`, `SimilarGroupContainer`)만 클라이언트이며, `pickMostDifferentIssue`에는 경량 `IssueSummary[]` 후보만 넘긴다.
- 로그인이 켜져 있고 세션이 없으면 두 섹션은 카드 대신 안내 문구 + 로그인 링크(`/login?next=/discover`)를 보여준다.

### 06 나 `/me`
- "나의 정치 관점": 축 5개(경제/복지/노동/환경/외교) 슬라이더 시각화(읽기 전용), 좌우 라벨, 안내문 "성향 라벨이 아니라 기록입니다".
- "내 생각이 바뀐 이슈": before → after 카드 + "무엇이 생각을 바꿨나요?".
- "나의 참여" 타일 3개(투표한 이슈 = localStorage 투표 수, 읽은 근거, 바뀐 생각). 페이지는 서버 컴포넌트이고 투표 수만 `ParticipationTilesContainer`(클라이언트)가 채운다.
- 로그인 시 최상단에 계정 카드(`AccountCardView` — 아바타·이름·이메일·로그아웃). 로그인이 켜져 있고 세션이 없으면 본문 대신 `LoginRequiredView`(안내 카드 + 로그인 버튼)만 렌더한다.

## 7. 컴포넌트 구조

```
src/
  app/
    layout.tsx                 # 폰트, 토큰, AppShell(탭바)
    page.tsx                   # 홈 (server)
    discover/page.tsx          # 발견 (server)
    me/page.tsx                # 나 (server)
    login/page.tsx             # 로그인 (server)
    issues/[issueId]/page.tsx
    issues/[issueId]/result/page.tsx
    issues/[issueId]/claims/[claimId]/page.tsx
    api/                       # 앱이 쓰는 REST 라우트 (이슈 목록·상세, 투표, 근거 피드백)
    admin/(review)/            # 관리자 검수 화면 라우트 그룹 (로그인 화면만 그룹 밖)
  components/
    auth/    LoginPageView, OAuthLoginContainer(client), OAuthButtonView, GoogleMarkIcon,
             KakaoMarkIcon, AuthActionView, AccountCardView, LoginRequiredView, LoginErrorView,
             getUserInitial
    common/  AppShellView, AppHeaderView, PageHeroView, HeaderActionButtonView, TabBarView,
             ChipView(+ChipTone, claimSideChipTone, voteChoiceChipTone),
             CardView(+CardElement, CardTone), BackHeaderView, ArrowLinkView,
             DistributionBarView, DistributionLegendView, SectionTitleView, StatTileView,
             joinClassNames, icons/*(BaseIcon + 9종)
    home/    IssueCardView, IssueListView
    issue/   IssueHeroView, SummaryView, KeyPointsView, ClaimCardView, ClaimSectionView,
             MediaPerspectiveView, VotePanelView, VotePanelContainer(client)
    result/  VoteResultContainer(client), VoteResultView, DifferentOpinionCtaView, NotVotedView,
             LoginToVoteView, OpinionGroupListView(client), OpinionGroupItemView,
             useOpinionGroupState
    claim/   EvidenceListView, EvidenceTypeBadgeView, ClaimHeaderView,
             ClaimFeedbackView, ClaimFeedbackOptionView, ClaimFeedbackContainer(client)
    discover/ MostDifferentIssueContainer(client), MostDifferentIssueView, MostDividedIssueView,
             IssueQuestionLinkView, SimilarGroupContainer(client), SimilarGroupView,
             pickDiscoverIssues
    me/      MeHeaderView, PerspectiveAxesView, OpinionChangeView, ParticipationTilesView,
             ParticipationTilesContainer(client), formatMonthsAgo
  domain/   enum 파일들, Issue.ts, IssueSummary.ts, IssueResultSummary.ts,
            OpinionGroupSummary.ts, UserRecord.ts, computeDistribution.ts,
            voteChoiceLabel.ts, claimSidePresenter.ts
  data/     issues/*.ts, IssueRepository.ts, perspectiveData.ts
  store/    UserRecordStore.ts, useVote.ts, useUserVotes.ts, useClaimFeedback.ts,
            VoteApiClient.ts, LoginRequiredError.ts
  server/   서버 전용 모듈 — 관리자 세션·서버 액션 유스케이스, 투표 저장소, 쿠키 서명
  pipeline/ 뉴스 수집부터 논점 추출까지의 파이프라인 단계와 외부 클라이언트 경계
  testing/  테스트에서만 쓰는 가짜 구현 (FakePrismaClient 등)
  lib/      supabase/*(세션 클라이언트·getSessionUser), auth/*(buildLoginHref, isAuthEnabled)
  proxy.ts  Next 16의 middleware 대체 파일 — /admin/** 세션 쿠키 검사
```

- 뷰 컴포넌트는 `*View.tsx`, 상태 훅은 `use*State.ts`, 순수 함수 모듈은 camelCase. `index.ts` 금지, re-export 금지.
- **서버 컴포넌트 기본.** `IssueRepository`·`perspectiveData` 호출은 `app/**/page.tsx`(서버)에서만 하고, 목 데이터가 클라이언트 번들에 들어가지 않게 한다.
- `*Container.tsx`(`'use client'`)는 localStorage 훅·라우터를 순수 뷰에 주입하는 얇은 계층이다. 뷰는 props만 받는다.
- 클라이언트로 이슈 정보를 넘겨야 할 때는 `Issue` 전체가 아니라 화면별 경량 타입(`IssueSummary`·`IssueResultSummary`·`OpinionGroupSummary`)을 넘긴다.
- 이슈 질문처럼 투표 여부와 무관한 값은 서버 컴포넌트(`page.tsx`)에서 `<h1>`으로 렌더해 SSR 골격을 먼저 보여주고, 클라이언트 컨테이너 안의 카드 제목은 `<h2>` 이하로 둔다.
- className 결합은 `joinClassNames`(`components/common`) 하나로만 한다.
- 이벤트 핸들러는 `handle*`, props 콜백은 `on*`. JSX 안에 인라인 화살표 핸들러를 두지 않는다.
- 찬반 표현(앵커·라벨·섹션 제목)은 `claimSidePresenter`, 칩 톤은 `claimSideChipTone` 한 곳에서만 매핑한다.

## 8. 테스트

- `computeDistribution.test.ts` — 합 100 유지, 선택 항목 증가, 참여자 수 +1(반올림이 애매한 분포 포함).
- `claimSidePresenter.test.ts` / `claimSideChipTone.test.ts` / `voteChoiceChipTone.test.ts` — 진영별 앵커·라벨·제목·칩 톤, 내 선택 반대편 진영, 선택지별 칩 톤.
- `IssueResultSummary.test.ts` / `OpinionGroupSummary.test.ts` — 경량 변환이 상세 데이터를 떨어뜨리는지.
- `voteChoiceLabel.test.ts` — 선택지 한글 라벨.
- `IssueRepository.test.ts` — 5개 이슈, id 조회, claims 찬 3/반 3, 분포 합 100, 질문형 제목, 매체 수·기간 라벨.
- `perspectiveData.test.ts` — 관점 축 5개, 의견 변화가 실제 이슈·주장을 참조.
- `UserRecordStore.test.ts` — set/get 라운드트립, 없는 키 null, 깨진 JSON 복구, SSR 가드(`window` 미정의).
- `useVote.test.tsx` / `useClaimFeedback.test.tsx` — 저장·토글·이슈 간 독립성.
- `pickDiscoverIssues.test.ts` — 가장 다른 의견/가장 갈리는 이슈 선정(`IssueSummary` 입력).
- `IssueCardView.test.tsx` — 질문·태그·참여자·퍼센트 렌더, 링크 href.
- `ClaimCardView.test.tsx` — 근거 수·설득 수·링크, 찬반 카드가 같은 구조(role)로 렌더.
- `VotePanelView.test.tsx` — 버튼 3개, 클릭 시 `onVote(choice)` 호출, 선택 상태, 로드 전 비활성.
- `VoteResultView.test.tsx` — 퍼센트 3개, 내 선택 배지, progressbar.
- `VoteResultContainer.test.tsx` — 미투표 안내, 투표 반영 분포와 반대 진영 CTA.
- `OpinionGroupListView.test.tsx` — 3그룹, 클릭 시 확장(상세는 항상 렌더되고 `hidden`으로 토글).
- `ClaimFeedbackView.test.tsx` — 3버튼, 토글, 로드 전 비활성.
- `EvidenceListView.test.tsx` — 타입 배지·출처·요약, 외부 링크(`{출처} 원문 보기`).
- `PerspectiveAxesView.test.tsx` — 축 5개, 라벨, meter 값.
- `formatMonthsAgo.test.ts` — "N개월 전" 표기.

CSS Modules 클래스명에 의존하는 단언은 두지 않는다(role·텍스트 기반으로 검증).

## 9. 검증 명령

```bash
npm run lint && npm run typecheck && npm test && npm run build
```
