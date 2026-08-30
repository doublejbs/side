# SIDE 실데이터 파이프라인 스펙

> 전제: `docs/Spec.md`(MVP 화면·도메인)를 그대로 유지하면서 목 데이터를 실데이터로 대체한다.
> 흐름: **뉴스 수집 → 같은 이슈 묶기 → 이슈 분류 → 이슈 요약 → 찬성/반대 논점 추출 → 근거 검증 → 출처 연결 → 관리자 검수 → 앱 API → 여론 투표**
> 모델 티어링(classify·verify 단계, 저가 모델로 넓게 거르고 고가 모델은 노출 후보에만)은 `docs/PipelineTieringSpec.md` 를 따른다.

## 1. 결정 사항

| 항목 | 선택 |
|---|---|
| 뉴스 소스 | 네이버 뉴스 검색 API (NAVER API HUB, `GET https://naverapihub.apigw.ntruss.com/search/v1/news`) |
| LLM | OpenAI API — 임베딩 `text-embedding-3-small`, 생성 `gpt-5.4-mini`, 분류 `gpt-5.4-nano`(환경변수로 교체 가능) |
| DB | Postgres + Prisma ORM. 로컬은 `docker compose`(postgres:16), 운영은 Supabase 등 `DATABASE_URL` |
| 관리자 | 같은 Next 앱의 `/admin`, `ADMIN_PASSWORD` 기반 세션 쿠키 |
| 투표 | 서버 저장(`Vote` 테이블) + 익명 식별자 쿠키. 내 선택은 localStorage에도 유지 |

## 2. 환경 변수 (`.env.example`)

```
DATABASE_URL=postgresql://side:side@localhost:5432/side
NCP_APIGW_API_KEY_ID=
NCP_APIGW_API_KEY=
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.4-mini
OPENAI_NANO_MODEL=gpt-5.4-nano
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
PIPELINE_DEBATE_THRESHOLD=60
PIPELINE_EXPOSE_LIMIT=10
ADMIN_PASSWORD=
ANON_COOKIE_SECRET=
```

| 변수 | 기본값 | 쓰는 단계 |
|---|---|---|
| `OPENAI_TEXT_MODEL` | `gpt-5.4-mini` | summarize · extract · verify |
| `OPENAI_NANO_MODEL` | `gpt-5.4-nano` | classify |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | cluster |
| `PIPELINE_DEBATE_THRESHOLD` | `60` | classify 통과 점수(0~100). 미달은 `AUTO_REJECTED` |
| `PIPELINE_EXPOSE_LIMIT` | `10` | 실행 1회의 summarize·extract 대상 상한(점수 내림차순) |

숫자 변수는 정수·범위를 검사하고 어긋나면 `InvalidEnvValueError` 로 즉시 종료한다(`PipelineEnv.ts`).

`DATABASE_URL`이 없으면 앱은 기존 목 데이터(`src/data/issues`)로 동작한다(폴백). 파이프라인 CLI는 **실행할 단계에 필요한** 필수 변수가 없으면 즉시 종료하며 무엇이 빠졌는지 모아서 출력한다(`PipelineEnv.ts`·`MissingEnvError.ts`).

## 3. 데이터 모델 (Prisma)

```prisma
enum IssueStatus { DRAFT REVIEW PUBLISHED REJECTED }
enum ClaimSide { AGREE DISAGREE }
enum EvidenceType { FACT RESEARCH EXPERT CLAIM }
enum MediaLeaning { PROGRESSIVE CENTRIST CONSERVATIVE }
enum VoteChoice { AGREE DISAGREE UNSURE }
enum ClaimFeedback { PERSUADED NOT_PERSUADED LACKS_EVIDENCE }

model SearchQuery {          // 수집 키워드 (관리자 편집)
  id String @id @default(cuid())
  keyword String @unique
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
}

model Publisher {            // 매체 도메인 → 매체명 · 성향 (관리자 편집)
  id String @id @default(cuid())
  domain String @unique      // 정규화한 도메인. `publisherDirectory.ts` 는 초기 시드일 뿐이다
  name String
  leaning MediaLeaning?      // 관리자가 지정. null 이면 언론 관점 집계에서 제외한다
}

model Article {
  id String @id @default(cuid())
  naverLink String @unique     // 네이버 링크 (중복 제거 키)
  originalLink String
  title String                 // HTML 태그·엔티티 제거 후
  description String
  publisher String?            // originalLink 도메인 → 매체명 매핑, 없으면 도메인
  publishedAt DateTime
  collectedAt DateTime @default(now())
  embedding Float[]            // 1536차원, pgvector 미사용(단순 배열)
  issueId String?
  issue Issue? @relation(fields: [issueId], references: [id])
  evidences Evidence[]
  @@index([issueId])
  @@index([publishedAt])
}

model Issue {
  id String @id @default(cuid())
  status IssueStatus @default(DRAFT)
  slug String? @unique          // PUBLISHED 시 부여 (URL)
  question String               // 질문형 제목
  tags String[]
  summary String[]              // 3~5문장
  keyPoints Json                // KeyPoint[] {id,title,question}
  commonCoverage String[]
  mediaPerspectives Json        // MediaPerspective[] (leaning, articleCount, frame, keywords, representativeArticle)
  opinionGroups Json            // OpinionGroup[] — 파이프라인이 초안 생성, 검수에서 수정
  centroid Float[]              // 클러스터 중심 임베딩
  articles Article[]
  claims Claim[]
  votes Vote[]
  reviewNote String?
  summarizedAt DateTime?         // 마지막으로 요약(4.3)에 성공한 시각. null이면 아직 요약된 적 없음
  summarizedArticleCount Int @default(0)  // 마지막 요약 시점의 기사 수 — 재요약 판단의 분모
  publishedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([status])
}

model Claim {
  id String @id @default(cuid())
  issueId String
  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  side ClaimSide
  order Int
  title String
  description String
  evidences Evidence[]
  feedbacks ClaimFeedbackRecord[]
}

model Evidence {
  id String @id @default(cuid())
  claimId String
  claim Claim @relation(fields: [claimId], references: [id], onDelete: Cascade)
  type EvidenceType
  source String
  date DateTime
  summary String
  url String
  articleId String?
  article Article? @relation(fields: [articleId], references: [id])
}

model Vote {
  id String @id @default(cuid())
  issueId String
  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  anonId String
  choice VoteChoice
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([issueId, anonId])   // 1인 1표, 변경 가능
}

model ClaimFeedbackRecord {
  id String @id @default(cuid())
  claimId String
  claim Claim @relation(fields: [claimId], references: [id], onDelete: Cascade)
  anonId String
  feedback ClaimFeedback
  createdAt DateTime @default(now())
  @@unique([claimId, anonId])
}

model PipelineRun {             // 실행 이력·관측
  id String @id @default(cuid())
  step String
  status String                 // RUNNING | SUCCESS | FAILED
  detail Json?
  startedAt DateTime @default(now())
  finishedAt DateTime?
}
```

## 4. 파이프라인 (`src/pipeline/`)

CLI: `npm run pipeline -- [collect|cluster|classify|summarize|extract|verify|link|all] [--issue <id>] [--dry-run]` (`scripts/RunPipeline.ts`, `tsx` 실행). 각 단계는 멱등이며 `PipelineRun`에 기록한다. 인자는 `parsePipelineArgs.ts`가 읽는다.

- `--issue <id>`: 그 이슈 하나만 처리한다(`classify`·`summarize`·`extract`·`verify`·`link`). `--issue=<id>` 형태도 된다.
- `--dry-run`: 외부 호출 없이 가짜 뉴스·임베딩·텍스트 클라이언트(`DryRunClients.ts`, `FakeEmbeddingClient.ts`)로 실행한다. `DATABASE_URL`만 있으면 된다.
- 환경 변수는 **실행할 단계에 필요한 것만** 검사한다(`readPipelineEnv({ requires })`). 예: `link`는 `DATABASE_URL`만, `collect`는 `NAVER_*`까지, 나머지 LLM 단계는 `OPENAI_API_KEY`까지.

단계 모듈은 순수 함수 모듈이므로 camelCase 파일명을 쓴다(프로젝트 컨벤션).

### 4.1 수집 `collect` — `collectArticles.ts`, `NaverNewsClient.ts`
- 활성 `SearchQuery`마다 `display=100&sort=date`로 최근 기사 조회(최대 3페이지). 헤더 `X-NCP-APIGW-API-KEY-ID/KEY`.
- 응답 `items[]`: `title`, `originallink`, `link`, `description`, `pubDate`(RFC 2822). `<b>`·HTML 엔티티 제거(`stripHtml.ts`).
- `naverLink` 기준 upsert(중복 무시). `publisher`는 `originallink` 도메인을 `publisherDirectory.ts`로 매핑(없으면 도메인 그대로).
- `display`는 API 상한인 100(최소 1)으로 잘라서 보낸다 — 넘겨 보내면 400이 떨어진다.
- 실패(429/5xx)는 지수 백오프 3회. 테스트는 `fetch`를 모킹.

### 4.2 묶기 `cluster` — `clusterArticles.ts`
- `embedding`이 빈 기사에 대해 `title + '\n' + description`을 배치(≤100건)로 임베딩.
- 미배정 기사(`issueId null`)를 발행일 순으로 순회하며, **최근 14일 안에 발행된 기사를 가진** `Issue`(DRAFT/REVIEW/PUBLISHED) 중 **코사인 유사도 ≥ 0.82**인 가장 가까운 이슈에 배정(centroid를 이동 평균으로 갱신). 최근성 기준은 `Issue.updatedAt`이 아니라 `articles.some.publishedAt`이다 — 검수로 이슈를 손댄 것만으로 오래된 이슈가 다시 열리면 안 된다.
- 배정되지 않은 기사끼리 greedy로 묶어 **3건 이상**이면 새 `Issue(DRAFT, question='(미정)')` 생성. 2건 이하는 보류(다음 실행에서 재시도).
- **임베딩 차원 방어**: 기대 차원(`expectedDimension` 옵션 또는 이번 실행에서 처음 만난 유효 임베딩의 길이)과 다른 임베딩은 배정·묶기 양쪽에서 제외하고 결과의 `skippedDimension`으로 센다. 임베딩 모델을 바꿔 차원이 섞여도 배치 전체가 죽지 않는다. `cosineSimilarity`/`greedyCluster`도 길이 불일치를 예외가 아니라 유사도 0으로 다룬다.
- 임베딩이 아직 없는 기사는 `deferred`로 센다(다음 실행에서 재시도).
- **부하 방어**: 미배정·미임베딩 기사 조회는 `take`(기본 2000)로 한 실행 처리량을 자른다. 기사 배정과 centroid 갱신은 기사마다 UPDATE하지 않고 이슈별로 배치 끝에 한 번씩만 쓴다.
- 결과: `{ embedded, assigned, created, deferred, skippedDimension }`.
- 순수 함수 `cosineSimilarity.ts`, `greedyCluster.ts`는 단위 테스트.

### 4.1a 분류 `classify` — `classifyIssues.ts` (nano)
임베딩 클러스터링은 "같은 사건"은 묶지만 "정책 논쟁인가"는 가리지 못한다. 그래서 요약·추출 앞에 저가 모델(`OPENAI_NANO_MODEL`) 단계를 둔다. 대상은 `status=DRAFT` 이면서 아직 분류되지 않았거나 분류 이후 기사가 더 붙은 이슈다. 이슈 기사 최대 40건과 최근 30일 이슈 목록(중복 판단용, 최대 50개)을 넣고 `IssueClassification`(`isPolicyDebate`·`debateScore`·`topic`·`reason`·`entities`·`keySentences`·`keyClaims`·`duplicateOfIssueId`)을 받아 `debateScore`·`topic`·`classification`·`classifiedAt` 에 저장한다. 정책 논쟁이 아니거나 점수가 `PIPELINE_DEBATE_THRESHOLD` 에 못 미치면 `status=AUTO_REJECTED` 로 넘기고 `reviewNote` 에 `[자동 제외] {reason}` 을 남긴다. 중복 후보는 `[중복 가능] {질문}` 경고만 남기고 자동으로 병합하지 않는다. 자세한 내용은 `docs/PipelineTieringSpec.md` 4.1장.

### 4.3 요약 `summarize` — `summarizeIssues.ts`
- 대상: `status`가 `DRAFT` 또는 `REVIEW`이고 `debateScore >= PIPELINE_DEBATE_THRESHOLD` 인 이슈(검수 중에도 기사가 늘면 다시 요약한다). 점수 내림차순으로 `PIPELINE_EXPOSE_LIMIT` 개까지만 처리한다. `--issue` 를 지정하면 임계값·상한을 무시하되 `AUTO_REJECTED` 는 제외한다.
- 다시 요약하는 조건(셋 중 하나): `question === '(미정)'`(`UndecidedQuestion.ts`) · `summarizedAt == null` · `articleCount >= summarizedArticleCount * 1.3`(마지막 요약 이후 기사가 30% 이상 늘었다). 기사가 하나도 없으면 건너뛴다.
- 성공하면 `summarizedAt`·`summarizedArticleCount`를 이번 요약에 쓴 기사 수로 갱신한다.
- `REVIEW` 이슈가 다시 요약되면 상태는 그대로 두고 `reviewNote`에 `[재요약]` 경고 한 줄만 덧붙인다(관리자가 다시 검수하게 한다).
- 이슈 단위로 try/catch 한다. 하나가 실패해도 나머지는 계속 처리하고 실패한 id 를 결과의 `failed: string[]`에 담는다.
- LLM 호출(`generateSummaryDraft`)과 저장(`applySummaryDraft`)이 분리돼 있다. 검증된 초안을 받은 뒤에만 DB를 건드리므로, 생성이 실패하면 기존 요약이 그대로 남는다.
- 입력: 기사 제목·설명·매체·날짜 최대 40건. 출력(구조화, zod): `question`(질문형, `?` 종결, 30자 이내), `tags`(2개), `summary`(3~5문장, 사실 중심·설득 금지), `keyPoints`(4개 `{title, question}`).
- 분류 결과(`classification.keySentences`·`keyClaims`)가 있으면 사용자 프롬프트 앞에 "사전 추출 요지" 로 붙인다(기사 입력은 유지).
- 프롬프트 원칙(브리프 3·22장): 중립, 사실/주장 구분, 클릭베이트 금지, 특정 매체·정치인 평가 금지.
- OpenAI 호출은 `TextClient.ts` 경계 뒤에 둔다. 시그니처는 인자 하나짜리 객체다.

  ```ts
  generateStructured<T>(request: {
    schema: ZodType<T>;
    schemaName: string;   // 모델에 넘기는 JSON 스키마 이름
    systemPrompt: string;
    userPrompt: string;
  }): Promise<T>;
  ```

  구현은 `OpenAiTextClient.ts`(Responses API 구조화 출력, 형식 실패 시 1회 재시도 후 `StructuredOutputError`), 테스트는 `FakeTextClient.ts`, `--dry-run`은 `DryRunClients.ts`로 대체한다.
  `OPENAI_TEXT_MODEL`은 Structured Outputs 확장 제약(`minItems` 등)을 지원하는 최신 모델이어야 한다 — 구 스냅샷 모델은 400을 돌려준다.

### 4.4 논점 추출 `extract` — `extractClaims.ts`
- 출력(zod): `claims`: 찬성 3 + 반대 3, 각 `{side, title, description(2~3문장), evidences: [{articleIndex, type, summary}]}` (근거 ≥2). `articleIndex`는 입력 기사 배열 인덱스 — LLM이 URL을 지어내지 못하게 한다.
- 추가 출력: `mediaPerspectives` 초안(`leaning`별 `frame`, `keywords` 3개, `representativeArticleIndex`), `commonCoverage`(2~3개), `opinionGroups` 초안 3개(`label`, `share` 합 ≤ 100, `description`, `agreesWith/disagreesWith/mostDivided`는 claim 순번).
- **`Evidence` 행은 이 단계에서 만든다.** `articleIndex` → 입력 기사 배열의 `Article` 행으로 치환해 `Evidence(type, source=매체, date=publishedAt, summary, url=originalLink, articleId)`를 주장과 함께 저장한다. 인덱스가 범위 밖이면 그 근거는 버리고, 버린 개수를 세어 `reviewNote`에 `[근거 폐기 N건]`으로 남긴다. 스키마에서도 `articleIndex`에 상수 상한(`MAX_ARTICLE_INDEX`)을 둔다.
- 언론 관점의 대표 기사는 **성향이 일치하는 기사만** 채택한다. LLM이 엉뚱한 인덱스를 고르면 같은 성향의 첫 기사로 대체한다.
- 이슈 조회는 임베딩(1536차원 배열)을 제외한 `select`로 한다. 요약과 마찬가지로 이슈 단위 try/catch 이며 결과에 `failed: string[]`을 담는다. 생성(`generateClaimsDraft`)과 저장(`applyClaimsDraft`)이 분리돼 있어, 생성이 실패하면 기존 주장이 그대로 남는다.
- `leaning`은 **`Publisher` 테이블(관리자가 `/admin/publishers`에서 성향 지정)**로 결정하고 LLM에는 성향별로 그룹핑된 기사만 넘긴다. 성향이 지정되지 않은 매체는 `CENTRIST`로 채우지 않고 **언론 관점 집계에서 제외**한다(브리프 14장: 매체 평가 느낌 금지 — 코드에 성향 판단을 박지 않는다). `publisherDirectory.ts`는 도메인→매체명 초기 시드일 뿐 성향을 담지 않는다.

### 4.5a 근거 검증 `verify` — `verifyEvidence.ts` (mini)
`extract` 가 만든 근거가 실제로 그 주장을 지지하는지 다시 판정한다. 대상은 `status=DRAFT` 이고 `verifiedAt` 이 없는 이슈(`--issue` 지정 시 DRAFT·REVIEW). 주장별 근거를 요약과 원문 기사 제목·설명까지 묶어 넣고 `EvidenceVerdict[]`(`evidenceId`·`support`·`type`·`note`)를 받는다. `evidenceId` 는 입력으로 준 근거 id 여야 하며 모르는 id 는 버린다. 판정은 `Evidence.support`·`verificationNote`·`type` 에 저장하고, 무관·반박 근거도 **삭제하지 않고** `reviewNote` 에 `[근거 검증] 주장 "{제목}": 미지지 {n}건` 을 누적한다(지지+부분이 2건 미만이면 경고 한 줄 더). 마지막에 `verifiedAt` 을 갱신한다. 앱 응답에서는 `IssueMapper` 가 무관·반박 근거를 제외한다. 자세한 내용은 `docs/PipelineTieringSpec.md` 4.3장.

### 4.5 출처 연결 `link` — `linkSources.ts`
근거 생성은 4.4에서 끝난다. 이 단계는 **검증과 상태 전환만** 맡는다.

- 대상: `status=DRAFT`이고 `verifiedAt`이 있으면서 주장이 하나라도 있는 이슈(근거 검증 전에는 검수로 넘기지 않는다). 주장이 하나도 없으면 추출이 끝나지 않은 것이므로 다음 실행으로 미룬다. 주장이 6개(찬 3 + 반 3)에 못 미쳐도 검수로 넘기고 경고만 남긴다 — DRAFT 에 조용히 남아 사라지는 편이 더 나쁘다.
- 검증해 경고를 모은다(`collectIssueWarnings`, 순수 함수): 근거가 2개 미만인 주장 · 이 이슈에 속하지 않는 기사를 가리키는 근거 · 한쪽 주장이 3개 미만.
- 경고는 기존 `reviewNote` 아래에 덧붙이고(`appendWarnings`), 경고가 있어도 `status=REVIEW`로 넘겨 관리자가 검수 화면에서 보게 한다.

### 4.6 스케줄
- MVP는 수동 CLI. `vercel.json`/cron은 범위 밖(문서에만 남김).

## 5. 관리자 검수 `/admin`

- 로그인 `/admin/login`: 폼 → 서버 액션이 `ADMIN_PASSWORD` 비교 → `side_admin` HttpOnly 쿠키(HMAC 서명, `ANON_COOKIE_SECRET` 사용, 12시간). `src/proxy.ts`(Next 16의 middleware 대체 파일명)에서 `/admin/**` 보호.
- 라우트 구성: 로그인 화면을 뺀 검수 화면들은 **라우트 그룹 `src/app/admin/(review)/`** 아래 둔다(URL에는 그룹 이름이 드러나지 않는다). 그룹 레이아웃이 세션을 확인하므로 `/admin/login`만 인증 밖이다.
- 프록시 통과는 1차 방어일 뿐이므로, **서버 액션은 실행 시작 시 `requireAdminSession()`(`src/server/requireAdminSession.ts`)으로 세션 쿠키를 다시 검증**한다. 서버 액션은 URL이 아니라 POST 엔드포인트로 직접 호출될 수 있기 때문이다.
- `/admin` 목록: 상태 탭(REVIEW 기본 / DRAFT / AUTO_REJECTED / PUBLISHED / REJECTED), 각 행: 질문, 기사 수, 주장 수, 논쟁성 점수, 주제, 생성일, 경고·중복 배지.
- `/admin/issues/[id]` 검수 폼(서버 액션):
  - 질문·태그·요약 문장·쟁점 4개 편집
  - 주장 6개(찬 3/반 3) 제목·설명 편집, 근거 목록(타입 변경·삭제), 기사 원문 링크
  - 언론 관점 3개 프레임·키워드·대표 기사 편집, 공통 내용 편집
  - 의견 그룹 3개 편집
  - 버튼: **저장**, **승인(PUBLISHED, slug 생성)**, **반려(REJECTED + 메모)**, **요약 다시 생성**, 자동 제외·반려 상태에서만 **검수 대상으로 복원**(→ DRAFT, `debateScore=100`, `reviewNote`·`classifiedAt` 유지 — `docs/PipelineTieringSpec.md` 5장)
- **요약 다시 생성**(`regenerateIssue.ts`)의 규칙:
  - `status`가 `DRAFT`·`REVIEW`가 아니면 `RegenerateNotAllowedError`를 던진다. 이미 공개·반려된 이슈의 주장을 말없이 갈아 끼우지 않는다. 화면에서도 그 상태에서는 버튼을 비활성으로 두고 이유를 적는다.
  - 먼저 LLM 결과(요약·논점)를 **메모리로** 모두 받아 검증하고, 성공했을 때만 한 트랜잭션에서 기존 주장 삭제 → 새 주장 저장 → 이슈 갱신 → `status=REVIEW`를 한다. 실패하면 DB는 전혀 바뀌지 않는다.
  - 분류(classify)는 그대로 두고 요약 → 추출 → 검증 → 연결만 다시 실행한다. 근거 id 는 주장을 저장한 뒤에야 정해지므로 검증은 저장 트랜잭션 뒤에 이어서 돈다.
  - `reviewNote`는 지우지 않고 `[재생성 YYYY-MM-DD]` 줄을 덧붙인다.
  - 서버 액션은 Prisma를 직접 참조하지 않고 `src/server/getPipelineDeps.ts` 경계(prisma + textClient, 없으면 `null`)를 통해 호출한다. `AdminStore`는 이 책임을 갖지 않는다.
- **승인 시 slug 생성 규칙**(`src/server/slugify.ts`):
  - slug 는 **ASCII(영문 소문자·숫자·하이픈)로만** 만든다. 한글 slug 는 링크를 공유하거나 다른 시스템에 붙여 넣을 때 퍼센트 인코딩돼 읽기 어렵고 라우팅에서도 어긋나기 쉽다.
  - 질문을 소문자로 바꾼 뒤 `[0-9a-z\s-]` 외 문자(한글 포함)를 버리고, 공백·연속 하이픈을 `-` 하나로 모으고, 앞뒤 하이픈을 떼고 60자로 자른다. 예: `CPTPP 가입을 추진해야 할까?` → `cptpp`, `AI 규제, 지금 필요한가?! (2026)` → `ai-2026`.
  - 남는 글자가 2자 미만이면(한글만으로 이루어진 질문, `주 4일제를 도입해야 할까?` 처럼 숫자 한 자만 남는 질문) `issue-<yyyymmdd>-<6자 해시>` 폴백을 쓴다. 날짜는 UTC 기준, 해시는 질문의 FNV-1a 32비트 값을 36진수로 적은 것이라 같은 질문이면 항상 같다. 예: `정년을 연장해야 할까?` → `issue-20260830-1a2b3c`.
  - 중복이면 `resolveUniqueSlug` 가 `-2`, `-3` … 을 붙인다(최대 100).
  - 이 규칙 이전에 만들어진 한글 slug 도 계속 열려야 하므로, 페이지·API 는 라우트 파라미터를 `decodeSlugParam`(`src/server/decodeRouteParam.ts`)으로 디코드한 뒤 조회한다.
- `/admin/queries`: 수집 키워드 추가/비활성화.
- `/admin/publishers`: 매체 도메인 → 매체명 · 성향 테이블 편집(파일 대신 DB 테이블 `Publisher`로 승격: `domain @unique, name, leaning?`). `publisherDirectory.ts`는 초기 시드.
- 관리자 UI는 앱과 같은 토큰을 쓰되 데스크톱 폭(`max-width: 960px`) 허용. 컴포넌트는 `src/components/admin/`.

## 6. 앱 API (`src/app/api/`)

| 메서드·경로 | 설명 |
|---|---|
| `GET /api/issues` | PUBLISHED 이슈 목록: `IssueSummary` + 분포·참여자 수 |
| `GET /api/issues/[slug]` | 이슈 상세(`Issue` 도메인 형태). 분포·참여자 수는 `Vote` 집계 |
| `POST /api/issues/[slug]/votes` | body `{ choice }`. 익명 쿠키 `side_anon`(없으면 발급) 기준 upsert. 응답: 갱신된 분포·참여자 수·내 선택 |
| `GET /api/issues/[slug]/votes/me` | 내 선택 |
| `POST /api/claims/[id]/feedback` | body `{ feedback \| null }` upsert/삭제 |

- 응답 타입은 `src/domain/*` 인터페이스를 재사용한다(`Issue`, `VoteDistribution` 등). Prisma 행 → 도메인 변환은 `src/data/IssueMapper.ts`.
- 분포 계산: `Vote` group by. 표가 0이면 `{0,0,0}`·참여자 0. 퍼센트는 최대 나머지 방식(`computeDistribution.ts`의 헬퍼 재사용).
**캐싱 정책: 공개 페이지 ISR 60초 + 승인/반려 시 revalidatePath.** 홈·발견·나·이슈 상세·결과·주장 상세는 `export const revalidate = 60`으로 정적 프리렌더 결과를 60초마다 다시 만든다(`generateStaticParams`만 두면 빌드 시점 데이터가 그대로 굳는다). 검수 결과가 60초를 기다리지 않고 보이도록, 관리자 서버 액션(`AdminActions.ts`)은 승인·반려가 성공한 뒤 `revalidatePath('/')`·`revalidatePath('/discover')`와 동적 경로 3개(`/issues/[issueId]`, `.../result`, `.../claims/[claimId]`, 두 번째 인자 `'page'`)를 무효화한다. 경로 목록은 `src/server/PublicPageTargets.ts`가 갖고, `adminUseCases`는 `next/cache`를 직접 import하지 않고 `revalidatePublicPages` 콜백으로 주입받는다(인메모리 저장소로 하는 테스트가 Next 런타임에 묶이지 않게).

- 페이지(서버 컴포넌트)는 fetch 대신 `IssueRepository`를 직접 호출한다. 리포지토리를 **비동기 인터페이스**로 바꾸고 구현 2개: `PrismaIssueRepository`(DATABASE_URL 있을 때), `MockIssueRepository`(기존 목). `getIssueRepository()`가 환경에 따라 선택.
- 이슈 URL 파라미터는 `slug`(목 데이터의 `id`가 slug 역할).

## 7. 앱 변경

- `useVote`: 서버가 있으면 `POST /api/issues/[slug]/votes` 호출 후 응답 분포로 결과 화면 갱신; localStorage에는 내 선택만 캐시. 서버 없으면(목 모드) 기존 동작.
- 결과 화면 `VoteResultContainer`: 서버 분포 사용(목 모드는 `computeDistributionAfterVote` 유지).
- 근거 피드백 `useClaimFeedback`: 동일 패턴으로 `POST /api/claims/[id]/feedback`.
- 홈: PUBLISHED 이슈만, 최신 `publishedAt` 순.

## 8. 테스트

- 순수 함수: `stripHtml`, `parsePubDate`, `cosineSimilarity`, `greedyCluster`, `publisherDirectory` 조회, `IssueMapper`, 분포 집계.
- 클라이언트 모킹: `NaverNewsClient`(fetch 모킹: 정상/429 재시도/HTML 제거), `summarizeIssues`·`extractClaims`(`FakeTextClient`가 고정 JSON 반환 → zod 검증·`articleIndex` 범위 처리), `linkSources`(근거 수·범위·주장 수 경고).
- 모델 티어링: `classifySchema`·`verifySchema` zod 경계, `classifyIssues`(통과·자동 제외·중복 경고·존재하지 않는 중복 id 무시·실패 격리), `verifyEvidence`(판정 저장·경고 누적·삭제하지 않음·모르는 id 무시), `summarizeIssues`·`extractClaims` 대상 조건(임계값·노출 상한·`AUTO_REJECTED` 제외), `linkSources`의 `verifiedAt` 조건, `IssueMapper` 미지지 근거 제외, `PrismaEnumMappers` `AUTO_REJECTED`·`EvidenceSupport`, `PipelineStepPlan` 단계 순서·단계별 필수 env, `PipelineEnv` 숫자 변수 범위 검증.
- API 라우트: Prisma 클라이언트를 인터페이스(`VoteStore` — `src/server/VoteStore.ts`)로 감싸 인메모리 구현(`InMemoryVoteStore.ts`)으로 테스트(투표 upsert, 분포 집계, 쿠키 발급).
- 관리자: 로그인 쿠키 서명/검증 단위 테스트, 승인 시 slug 생성 규칙 테스트, 복원 유스케이스(허용 상태·`reviewNote`/`classifiedAt` 유지) 테스트.
- 테스트 대역은 `src/testing/`에 모은다(`FakePrismaClient.ts` — 파이프라인·관리자 코드가 실제로 쓰는 질의만 흉내 내는 인메모리 Prisma 대역). 프로덕션 코드는 이 디렉터리를 import 하지 않는다.
- `--dry-run` 고정 응답이 `summarizeSchema`·`extractSchema`를 통과하는지도 테스트로 지킨다(`DryRunClients.test.ts`).
- DB 통합 테스트는 `DATABASE_URL_TEST`가 있을 때만 실행(`describe.skipIf`).

## 9. 로컬 실행 순서

```bash
docker compose up -d            # postgres:16, 포트 5432
cp .env.example .env            # 키 채우기
npm run db:migrate              # 스키마 적용 (개발 중 스키마 변경은 npx prisma migrate dev)
npm run db:seed                 # 목 데이터 5이슈 + 기본 검색 키워드 + 매체 테이블 시드 (PUBLISHED)
                                # 데모 분포가 필요하면 `npm run db:seed -- --with-demo-votes`
npm run pipeline -- all         # 수집→묶기→분류→요약→추출→검증→연결
npm run dev                     # /admin 에서 검수 → 승인
```

## 10. 범위 밖

크론 스케줄링, pgvector, 기사 본문 크롤링(검색 API의 제목·설명만 사용), 사용자 계정, 의견 그룹 실제 클러스터링(투표 데이터 기반) — 다음 단계.
