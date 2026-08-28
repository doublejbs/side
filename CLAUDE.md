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
```

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
- 목 데이터는 `src/data/`에만 두고 `IssueRepository`를 통해서만 접근한다. Repository 호출은 서버 컴포넌트(`page.tsx`)에서만 하고, 클라이언트에는 필요한 값만 props로 넘긴다.
- 테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.
