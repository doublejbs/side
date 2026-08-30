# SIDE

하나의 정치 이슈를 여러 관점에서 이해하고, 나와 다른 사람들의 생각을 발견하는 모바일 퍼스트 웹 MVP.

## 스택

Next.js 16 · React 19 · TypeScript · Prisma 6 · Supabase · OpenAI API

## 로컬 실행

### 준비

```bash
# 로컬 PostgreSQL 시작
docker compose up -d

# 환경변수 설정
cp .env.example .env
# → .env 에서 API 키·비밀번호 입력

# 의존성 설치
npm install

# 마이그레이션 및 시드
npm run db:migrate
npm run db:seed
```

### 개발 서버

```bash
# HTTPS 개발 서버 시작
npm run dev

# 또는 HTTP가 필요하면
npm run dev:http
```

브라우저에서 https://localhost:3000 열기.

### 기사 수집 및 파이프라인

```bash
# 전체 파이프라인 실행 (수집→묶기→분류→요약→추출→검증→연결)
npm run pipeline -- all

# 또는 특정 단계만
npm run pipeline -- classify
npm run pipeline -- summarize
```

자세한 내용은 `docs/PipelineSpec.md`와 `CLAUDE.md`를 참고하세요.

## 배포

Vercel 배포 가이드는 [`docs/Deploy.md`](./docs/Deploy.md)를 참고하세요.

- 사전 준비: Vercel 계정, Supabase 프로젝트, 환경변수 설정
- 프로젝트 연결: Vercel 대시보드에서 GitHub 리포지토리 import
- 자동 배포: `main` 브랜치 푸시 시 자동으로 Production 배포

## 명령

```bash
npm run dev           # 개발 서버 (HTTPS)
npm run dev:http      # 개발 서버 (HTTP)
npm run build         # 프로덕션 빌드
npm run start         # 프로덕션 서버 시작

npm run lint          # ESLint
npm run typecheck     # TypeScript 타입 검사
npm test              # Vitest 테스트 실행
npm test:watch        # Vitest 감시 모드

npm run db:generate   # Prisma 클라이언트 재생성
npm run db:migrate    # 마이그레이션 적용
npm run db:seed       # 시드 데이터 입력

npm run pipeline -- [step] [options]  # 파이프라인 실행
```

## 문서

- **스펙**: [`docs/Spec.md`](./docs/Spec.md) — MVP 화면·도메인 모델
- **파이프라인**: [`docs/PipelineSpec.md`](./docs/PipelineSpec.md) — 기사 수집·분석·검수 프로세스
- **파이프라인 모델 티어링**: [`docs/PipelineTieringSpec.md`](./docs/PipelineTieringSpec.md) — 저가/고가 모델 활용 전략
- **배포**: [`docs/Deploy.md`](./docs/Deploy.md) — Vercel 배포 가이드
- **개발 규칙**: [`CLAUDE.md`](./CLAUDE.md) — 프로젝트 컨벤션, 스택, 명령

## 라이선스

내부 프로젝트입니다.
