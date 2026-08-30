# SIDE

하나의 정치 이슈를 여러 관점에서 이해하고, 나와 다른 사람들의 생각을 발견하는 모바일 퍼스트 웹 MVP.

- 스펙: `docs/Spec.md` (구현 시 항상 우선 참고)
- 디자인: Direction B · Modern Data — 토큰은 `src/app/globals.css`, 근거는 `docs/Spec.md` 3장

## 스택

Next.js 16 App Router · React 19 · TypeScript strict · CSS Modules · Vitest + Testing Library

## 명령

```bash
npm run dev          # 개발 서버
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build

docker compose up -d # 로컬 Postgres (postgres:16, 5432)
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate deploy
npm run db:seed      # 목 이슈 5건 + 검색 키워드 + 매체 테이블 시드
                     # 데모 분포까지 넣으려면 npm run db:seed -- --with-demo-votes

npm run pipeline -- all            # 수집→묶기→분류→요약→추출→검증→연결
npm run pipeline -- classify       # 단계 하나만 (collect|cluster|classify|summarize|extract|verify|link)
npm run pipeline -- all --dry-run  # 외부 호출 없이 전 단계 실행
```

파이프라인은 저가 모델(`OPENAI_NANO_MODEL`)로 정책 논쟁성을 먼저 걸러내고(`classify`), 통과한 이슈만 고가 모델(`OPENAI_TEXT_MODEL`)로 요약·추출·근거 검증(`verify`)한다. 임계값은 `PIPELINE_DEBATE_THRESHOLD`·`PIPELINE_EXPOSE_LIMIT`. 근거는 `docs/PipelineSpec.md`·`docs/PipelineTieringSpec.md`.

`DATABASE_URL`이 없으면 앱은 목 데이터로 동작한다(폴백). lint·typecheck·test·build는 DB 없이 통과해야 한다.

## 프로젝트 컨벤션 (글로벌 컨벤션에 추가)

- 서버 컴포넌트가 기본. `localStorage`·이벤트 핸들러가 필요한 컴포넌트만 `'use client'`.
- 뷰는 `*View.tsx`, 상태 훅은 `use*State.ts`, 스타일은 같은 이름의 `*.module.css`.
- `*Container.tsx` — 순수 뷰에 클라이언트 상태(localStorage 훅·라우터)를 주입하는 `'use client'` 계층. 뷰는 항상 props만 받는다.
- 순수 함수 모듈(`computeDistribution.ts`, `pickDiscoverIssues.ts` 등)은 camelCase 파일명을 허용한다.
- 간격(padding·gap)은 px 직접 지정을 허용한다. 색상과 라운드는 `globals.css` 토큰(`--color-*`, `--radius-card`/`--radius-tile`/`--radius-control`/`--radius-pill`)을 반드시 사용한다.
- 막대·트랙·점처럼 높이에 맞춘 기하학적 radius(6px/3px/50% 등)는 라운드 토큰 예외로 px 직접 지정을 허용한다.
- 찬성/반대 UI는 항상 동일한 컴포넌트·동일한 크기로 렌더링한다 (Equal weight).
- 진영 연상 색(빨강/파랑) 금지. 찬성 `--color-agree`, 반대 `--color-disagree`, 모름 `--color-unsure`만 사용.
- 아이콘은 인라인 SVG 컴포넌트(`src/components/common/icons/`), 이모지 금지.
- 목 데이터는 `src/data/`에만 두고 리포지토리를 통해서만 접근한다. Repository 호출은 서버 컴포넌트(`page.tsx`)에서만 하고, 클라이언트에는 필요한 값만 props로 넘긴다.
- 리포지토리는 **비동기 인터페이스**(`IssueRepository`)로 선언하고, 구현은 `Mock*`(목 데이터) / `Prisma*`(DB) 두 벌을 둔다. 호출부는 `getIssueRepository()`로만 구현을 고른다.
- 이슈의 URL 식별자는 `slug`다. 라우트 파라미터 이름은 `[issueId]`지만 값은 slug이며, 링크·투표 기록 키도 slug를 쓴다.
- 테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.

## 로컬 HTTPS 개발 서버

- `npm run dev`는 `certificates/localhost*.pem`(mkcert로 생성, gitignore)을 사용하는 HTTPS 서버다. 인증서가 없으면 `mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost 127.0.0.1 ::1`로 만든다.
- 서버 액션의 `redirect()`가 내부 HTTPS 요청을 하므로 Node가 mkcert 루트 CA를 신뢰해야 한다(`NODE_EXTRA_CA_CERTS`). `dev` 스크립트가 `$MKCERT_CAROOT`(기본 `~/Library/Application Support/mkcert`)의 `rootCA.pem`을 자동 지정한다. 이 설정이 없으면 관리자 로그인이 `failed to get redirect response … unable to verify the first certificate`로 실패한다.
- HTTP가 필요하면 `npm run dev:http`.
