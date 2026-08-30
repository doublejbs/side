# Vercel 배포 가이드

SIDE 앱을 Vercel에 배포하고 운영하는 방법을 설명합니다.

## 사전 준비

### 1. Vercel 계정 및 CLI 설치

```bash
# Vercel CLI 설치 (global)
npm install -g vercel

# 로그인
vercel login
```

### 2. Node.js 버전 확인

Vercel은 기본적으로 Node 20을 사용합니다. 프로젝트는 Node 22 런타임을 권장하므로, Vercel 프로젝트 설정에서 **Environment Variables**에서 다음을 추가합니다:

```
NODE_VERSION = 22.x
```

또는 `package.json`에 engines 필드를 추가합니다:

```json
{
  "engines": {
    "node": ">=22"
  }
}
```

## 프로젝트 연결

### 방법 1: Vercel CLI (로컬에서)

```bash
vercel link
# → 새 프로젝트 생성 또는 기존 프로젝트 선택
# → 프로젝트 이름: side
```

### 방법 2: Vercel 대시보드 (권장)

1. [vercel.com](https://vercel.com) → **Add New...** → **Project**
2. GitHub 계정 연결
3. 이 리포지토리(`side`) import
4. 프로젝트 이름 확인 및 생성

## 환경변수 설정

Vercel 대시보드에서 **Settings** → **Environment Variables**로 이동해 다음을 추가합니다.

### Production 배포용

| 변수 | 값 | 설명 |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres?connection_limit=5` | Supabase 세션 풀러(포트 5432). **마이그레이션 전용이 아님** — 서버리스 앱이 직접 쿼리합니다 |
| `ANON_COOKIE_SECRET` | (32자 이상 임의 문자열) | 투표·관리자 쿠키 서명용 비밀키 |
| `ADMIN_PASSWORD` | (강력한 비밀번호) | `/admin` 로그인 비밀번호 |

### Preview 배포용 (선택사항)

Preview 환경(PR 브랜치)에도 위 세 변수를 동일하게 설정합니다. Preview에도 관리자 비밀번호가 필요하므로(앱이 퍼블릭이므로) 생략하지 않습니다.

### 환경변수 설정 CLI 명령

```bash
# Production
vercel env add DATABASE_URL
# → "Vercel" → "Production" 선택 → URL 붙여넣기

vercel env add ANON_COOKIE_SECRET
# → "Vercel" → "Production" 선택

vercel env add ADMIN_PASSWORD
# → "Vercel" → "Production" 선택

# Preview (같은 방식)
vercel env add DATABASE_URL
# → "Vercel" → "Preview" 선택

...
```

### 파이프라인(GitHub Actions) 환경변수는 Vercel에 불필요

`OPENAI_API_KEY`, `NCP_APIGW_API_KEY_ID/KEY` 등 파이프라인 전용 변수는 **GitHub 리포지토리의 Secrets**에만 등록합니다. Vercel에는 등록하지 않습니다.

## Supabase 연결 설정

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → **New project**
2. 지역: **Seoul**(ap-northeast-2) — Vercel도 서울 근처 리전 사용 시 지연 최소화
3. 프로젝트 생성 완료 대기

### 2. 데이터베이스 URL 확인

**Connection pooler (권장)** 사용:

1. 프로젝트 **Settings** → **Database**
2. **Connection pooler** 탭 → **Connection string** 복사
3. URI 형식: `postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres?connection_limit=5`
   - 포트: **5432** (세션 풀러)
   - 쿼리 파라미터: `?connection_limit=5` (Prisma 연결 풀 제한)

#
> **Vercel 런타임 `DATABASE_URL`은 Transaction pooler(6543)를 쓴다.** 서버리스 함수는 동시 인스턴스가 많아 세션 풀러(클라이언트 15개 한도)를 금방 소진한다. 형식: `postgresql://postgres.<ref>:<pw>@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=20`. 마이그레이션(`prisma migrate deploy`)은 GitHub Actions가 세션 풀러(5432) URL로 수행하므로 Vercel에서는 실행하지 않는다 — 즉 **GitHub 시크릿과 Vercel 환경변수의 `DATABASE_URL`은 서로 다른 포트**다.

> `connection_limit=1`로 배포하면 `next build` 프리렌더 중 한 요청의 병렬 쿼리가 풀을 기다리다 `P2024`(pool timeout)로 빌드가 실패한다(2026-08-30 실제 발생). Transaction pooler는 클라이언트 연결을 넉넉히 받으므로 `connection_limit=5&pool_timeout=20`을 쓴다.

## 3. 데이터베이스 마이그레이션 및 시드 (로컬에서)

```bash
# 로컬 환경에서 한 번만 실행 (Vercel에서는 실행하지 않음)
export DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres?connection_limit=5"

# 마이그레이션 적용
npx prisma migrate deploy

# 시드 데이터 입력 (필요시)
npm run db:seed
```

**주의:**
- **마이그레이션은 로컬에서만** 실행합니다. Vercel 빌드 시에는 `postinstall` 훅이 `prisma generate`만 실행하므로 마이그레이션은 별도로 하지 않습니다.
- GitHub Actions 파이프라인도 세션 풀러로 마이그레이션을 수행합니다.
- Vercel의 서버리스 런타임은 이미 마이그레이션된 스키마를 읽기만 합니다.

## 배포

### 자동 배포

`main` 브랜치에 푸시하면 Vercel이 자동으로 Production 배포를 시작합니다.

```bash
git push origin main
```

### 수동 배포

```bash
# Production 배포
vercel --prod

# Preview 배포 (기본)
vercel
```

## 배포 후 확인 체크리스트

배포가 완료되면 다음을 확인합니다:

- [ ] **홈 페이지** — 이슈 목록 로드 (HTTP 200)
- [ ] **API 응답** — `GET /api/issues` 응답 확인
- [ ] **관리자 로그인** — `/admin` 접속 → 비밀번호 입력 → 로그인 성공
- [ ] **검수 화면** — 이슈 목록 표시
- [ ] **이슈 승인** — 이슈를 PUBLISHED로 상태 변경 → 약 60초 후 홈에서 새로운 이슈 확인
- [ ] **투표** — `/issues/<slug>` 접속 → 투표 기능 동작
- [ ] **쿠키 보안** — 브라우저 개발자 도구 → Application → Cookies → `side_anon`, `side_admin`이 `Secure`, `HttpOnly` 플래그 설정 확인

### ISR(Incremental Static Regeneration)

- 공개 페이지(`/`, `/discover`, `/issues/[slug]` 등)는 ISR 60초로 설정됩니다.
- 관리자가 이슈를 **승인** 또는 **반려**하면 `revalidatePath`로 캐시를 즉시 무효화합니다.
- 최대 60초 내에 홈과 상세 페이지가 최신 상태로 갱신됩니다.

## 주의사항

### 1. Supabase 연결 문자열

| 용도 | 포트 | 파라미터 | 언제 사용 |
|---|---|---|---|
| 마이그레이션 (로컬/GitHub Actions) | 5432 (세션) | `connection_limit=5` | `prisma migrate deploy` |
| 서버리스 런타임 (Vercel) | 5432 (세션) | `connection_limit=5` | 앱 실행(쿼리 요청) |
| Transaction pooler | 6543 | `pgbouncer=true` | 사용 금지(Vercel에서) |

**결론:** Vercel에는 세션 풀러(5432) URI를 사용합니다.

### 2. 환경변수와 빌드

- Vercel 빌드 시 `npm ci` 후 `postinstall` 훅이 자동으로 실행됩니다.
- `prisma generate`는 buildtime에 실행되어 `@prisma/client` 타입을 생성합니다.
- Prisma 스키마 변경 후 `prisma generate`를 로컬에서 한 번 실행한 후 커밋합니다.

### 3. 레포지토리 공개 설정

- 이 레포지토리는 **Public** 입니다(누구나 읽을 수 있습니다).
- 환경변수는 Vercel 대시보드의 **Environment Variables** 섹션에서만 관리하며, 코드에는 넣지 않습니다.
- GitHub **Secrets**도 민감한 파이프라인 키만 저장합니다.

### 4. 관리자 페이지 보안

- `/admin` 및 모든 관리 API는 `ADMIN_PASSWORD` 기반 세션 쿠키로 보호됩니다.
- 로그인은 `src/server/adminSession.ts`에서 HMAC으로 서명하고, `src/proxy.ts`에서 1차 검증, 서버 액션에서 2차 검증합니다.
- 모든 환경(Production/Preview)에서 보안이 동일하게 적용됩니다.

## 배포 후 기사 수집 및 파이프라인

GitHub Actions 파이프라인은 다음 명령으로 수동 실행하거나 일정(KST 09:00, 18:00)에 자동으로 실행됩니다:

```bash
# 전체 파이프라인 (수집→묶기→분류→요약→추출→검증→연결)
gh workflow run pipeline.yml -f step=all

# 특정 단계만 (예: 분류)
gh workflow run pipeline.yml -f step=classify
```

자세한 내용은 `docs/PipelineSpec.md`와 `.github/workflows/pipeline.yml`을 참고하세요.

## 트러블슈팅

### 빌드 실패: `prisma generate` 오류

원인: `@prisma/client` 버전 불일치 또는 스키마 문제.

해결:
```bash
# 로컬에서 한 번
npm run db:generate

# 커밋 후 Vercel 재배포
git add prisma/
git commit -m "regenerate prisma client"
git push origin main
```

### 앱 실행 오류: `DATABASE_URL` 없음

원인: 환경변수 설정 누락.

확인:
```bash
# Vercel 대시보드 Settings → Environment Variables 에서 확인
# 또는 CLI:
vercel env pull
cat .env.local
```

### 마이그레이션 오류: Supabase 연결 실패

원인: 데이터베이스 URL 오류 또는 Supabase 프로젝트 미생성.

확인:
```bash
# 로컬에서 테스트
export DATABASE_URL="..."
npx prisma db execute --stdin < /dev/null
# 연결 성공 메시지 출력되면 OK
```

## 다음 단계

- 파이프라인이 정상으로 기사를 수집하도록 GitHub Secrets 설정 완료
- 파이프라인 실행 및 이슈 검수 시작
- 사용자 피드백 기반 기사·주제 조정
