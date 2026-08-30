# 파이프라인 모델 티어링 스펙 (classify · verify 단계 추가)

> 전제: `docs/PipelineSpec.md`의 5단계(collect → cluster → summarize → extract → link)를 유지하면서, **저가 모델(nano)로 넓게 걸러내고 고가 모델(mini)은 노출할 이슈에만 쓰는** 구조로 바꾼다.
> 배경: 실호출 첫 결과가 "기아 노사 합의될까?"처럼 찬반 논쟁이 아닌 예측형 이슈였다. 임베딩 클러스터링은 "같은 사건"은 잘 묶지만 "정책 논쟁인가"는 판별하지 못한다.

## 1. 목표 흐름

```
뉴스 N건 (collect)
   ↓ 임베딩 클러스터링 (cluster)                  — LLM 없음, 기존 유지
DRAFT 이슈 M개
   ↓ [nano] classify — 정책 논쟁성 판별 · 중복 이슈 병합 제안 · 핵심 문장/인물/정책/주장 추출
논쟁성 통과 이슈 (status DRAFT, debateScore ≥ 임계값)  /  미달 → AUTO_REJECTED
   ↓ [mini] summarize + extract — 노출 후보에만 (기존 로직, 모델만 mini)
   ↓ [mini] verify — 근거 ↔ 주장 지지 여부·근거 타입 재판정
   ↓ link — 구조 검증·경고 → REVIEW                — 기존 유지
관리자 검수 → PUBLISHED → 사용자는 조회만
```

## 2. 모델 · 환경 변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `OPENAI_NANO_MODEL` | `gpt-5.4-nano` | classify |
| `OPENAI_TEXT_MODEL` | `gpt-5.4-mini` | summarize · extract · verify (기존 `gpt-5-mini`에서 변경) |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | cluster (변경 없음) |
| `PIPELINE_DEBATE_THRESHOLD` | `60` | classify 통과 점수(0~100) |
| `PIPELINE_EXPOSE_LIMIT` | `10` | 실행당 summarize/extract 대상 상한(점수 내림차순) |

모델명은 2026-08-30 OpenAI `GET /v1/models`에서 존재 확인: `gpt-5-nano`, `gpt-5.4-nano`, `gpt-5.4-mini`.

## 3. 데이터 모델 변경 (Prisma, 마이그레이션 `0003_issue_classification`)

```prisma
enum IssueStatus { DRAFT REVIEW PUBLISHED REJECTED AUTO_REJECTED }   // AUTO_REJECTED 추가

model Issue {
  // ...기존 필드
  debateScore Int?                 // 0~100, classify 결과
  topic String?                    // '노동', '에너지' 등 nano가 부여한 주제
  classification Json?             // IssueClassification (아래)
  classifiedAt DateTime?
  verifiedAt DateTime?
}
```

```ts
// src/domain/IssueClassification.ts
interface IssueClassification {
  isPolicyDebate: boolean;        // 찬반이 갈리는 정책·사회 이슈인가 (사건 예측·단순 사고·연예 등은 false)
  debateScore: number;            // 0~100
  topic: string;                  // 주제 태그 1개
  reason: string;                 // 판정 근거 1문장 (관리자 표시용)
  entities: string[];             // 인물·기관·정책명 (≤8) — 정치인 실명은 허용되나 앱에 노출하지 않음(관리자 참고용)
  keySentences: string[];         // 핵심 문장 3~5 (기사 원문 요약 아님, 쟁점 요지)
  keyClaims: string[];            // 주요 주장 요지 3~6 (찬/반 구분 없음)
  duplicateOfIssueId?: string;    // 기존 이슈와 같은 이슈로 판단되면 그 id (병합 제안 — 자동 병합하지 않음)
}
```

```ts
// src/domain/EvidenceVerification.ts
enum EvidenceSupport { SUPPORTS = 'SUPPORTS', PARTIAL = 'PARTIAL', UNRELATED = 'UNRELATED', CONTRADICTS = 'CONTRADICTS' }
interface EvidenceVerdict { evidenceId: string; support: EvidenceSupport; type: EvidenceType; note: string }
// 구조화 출력의 루트는 객체여야 하므로 스키마는 `{ verdicts: EvidenceVerdict[] }` 형태다.
// EvidenceSupport 는 프로젝트 컨벤션에 따라 `src/domain/EvidenceSupport.ts` 로 분리한다.
```

`Evidence`에 `support EvidenceSupport?`, `verificationNote String?` 컬럼 추가(같은 마이그레이션). `IssueStatus` 도메인 enum(`src/domain/IssueStatus.ts`)과 `PrismaEnumMappers`에 `AUTO_REJECTED` 반영.

## 4. 단계 정의

### 4.1 `classify` — `classifyIssues.ts` (nano)
- 대상: `status = DRAFT` 이고 `classifiedAt == null` 또는 **분류 이후에 수집된 기사가 있는**(`article.collectedAt > classifiedAt`) 이슈. `--issue` 지정 시 해당 이슈(DRAFT/REVIEW).
  - 분류 결과 저장이 `Issue.updatedAt` 을 갱신하므로 `classifiedAt < updatedAt` 을 그대로 쓰면 매 실행마다 다시 분류하게 된다. "기사가 더 붙은 경우"를 기사 수집 시각으로 직접 확인한다.
- 입력: 이슈 기사 제목·설명 최대 40건(`selectPromptArticles` 재사용) + 최근 30일 내 다른 이슈의 `question`/`topic` 목록(중복 판단용, 최대 50개, id 포함).
- 출력: `IssueClassification` (zod, `src/pipeline/ClassifySchema.ts` — 구조화 출력이 선택 필드를 허용하지 않으므로 `duplicateOfIssueId` 는 `null` 을 받는다). 프롬프트는 `prompts/ClassifyPrompt.ts` — 중립성 원칙·`<articles>` 구분자 재사용. "정책 논쟁"의 정의를 명시: *정부·의회·지자체의 결정이나 제도 변경에 대해 사회적으로 찬성/반대가 갈리는 사안*. 예측형("~될까?"), 단일 사건 보도, 사고·재난, 인물 동정, 스포츠·연예는 `false`.
- 저장: `debateScore, topic, classification, classifiedAt`. `isPolicyDebate=false` 또는 `debateScore < PIPELINE_DEBATE_THRESHOLD` → `status = AUTO_REJECTED`, `reviewNote`에 `[자동 제외] {reason}` 추가. 통과 → DRAFT 유지.
- `duplicateOfIssueId`가 있으면 `reviewNote`에 `[중복 가능] {대상 question}` 경고만 남긴다(병합은 관리자 결정).
- 결과: `{ classified, passed, autoRejected, duplicates, failed[] }`.

### 4.2 `summarize` · `extract` 변경
- 대상 조건에 `debateScore >= threshold` 추가, 아래 순서로 정렬한 뒤 `PIPELINE_EXPOSE_LIMIT`개까지만 처리(`--issue` 지정 시 제한 무시, 단 AUTO_REJECTED는 제외).
- **대상 정렬**(`sortDuplicateAwareIssues`): `classification.duplicateOfIssueId` 없음 우선 → `debateScore` 내림차순 → 기사 수 내림차순. 중복으로 표시된 이슈를 뒤로 밀어, 상한 안에서 원본 이슈가 먼저 처리되게 한다.
- **중복 이슈 보류**(`duplicateHold.ts`): `classification.duplicateOfIssueId`가 **같은 실행 대상 집합 안의 다른 이슈** 또는 이미 `REVIEW`/`PUBLISHED`인 이슈를 가리키면, 그 이슈는 요약·추출하지 않고 `skipped`로 두고 `reviewNote`에 `[중복으로 보류] {대상 question}`을 남긴다(`appendNoteLine` 이 같은 줄을 두 번 쓰지 않으므로 한 번만 남는다). classify가 남긴 `[중복 가능]` 경고는 그대로 두고 덧붙인다. 병합·복원은 관리자가 판단한다(자동 병합·삭제 없음).
  - 두 이슈가 서로를 가리키면 둘 다 빠지지 않도록 먼저 보류된 쪽만 보류한다.
  - 가리키는 이슈가 없거나(지어낸 id) 대상 집합에도 없고 `REVIEW`/`PUBLISHED`도 아니면 보류하지 않는다.
  - `--issue` 지정 시에는 보류하지 않는다(관리자가 직접 고른 이슈다).
  - `extract`는 이미 `summarize`가 메모를 남겼으므로 대상에서 빼기만 한다.
- **질문 형식**: `summarize`의 `question`은 찬성/반대로 답할 수 있는 정책·제도 질문이어야 한다. 프롬프트(`SummarizePrompt.ts`)에 허용 형식(`~해야 할까?`·`~가 필요한가?`·`~를 허용해야 할까?`)과 금지 형식(`~쟁점은 무엇인가?`·`~어떻게 되나?`·`~막을 수 있나?`·`~될까?`·`~연결되나?`), 좋은 예·나쁜 예 3개씩을 명시한다. `summarizeSchema.question`은 `isStanceQuestion`(`src/pipeline/isStanceQuestion.ts` — 금지 어미 목록·허용 어미 목록 상수)으로 검증하고, 실패하면 `OpenAiTextClient`가 실패 사유를 붙여 1회 재시도한다.
- 프롬프트 입력에 `classification.keySentences`·`keyClaims`를 "사전 추출 요지"로 추가해 기사 원문 의존을 줄인다(기사 입력은 유지).
- 모델은 `OPENAI_TEXT_MODEL`(기본 `gpt-5.4-mini`).

### 4.3 `verify` — `verifyEvidence.ts` (mini)
- 대상: `status = DRAFT`, claims 6개, `verifiedAt == null`(또는 `--issue`).
- 입력: 주장 6개 × 각 근거(요약 + 원문 기사 제목·설명). 출력: `EvidenceVerdict[]`(zod, `VerifySchema.ts`) — 근거마다 `support`, 재판정 `type`, 한 줄 `note`.
- 저장: `Evidence.support/verificationNote/type` 갱신. `UNRELATED`·`CONTRADICTS` 근거는 **삭제하지 않고** 유지(관리자가 판단), 대신 `reviewNote`에 `[근거 검증] 주장 "{title}": 미지지 {n}건` 누적. 주장의 `SUPPORTS+PARTIAL` 근거가 1개 이하면 경고 한 줄 추가(`[근거 검증] 주장 "{title}": 지지 근거가 {n}건뿐입니다`).
- `verifiedAt` 갱신. 결과 `{ verified, flagged, failed[] }`.

### 4.4 `link` 변경
- 대상 조건에 `verifiedAt != null` 추가(검증 전 REVIEW 전환 방지). 경고 누적·REVIEW 전환은 기존과 같다.

### 4.5 CLI · 실행 순서
- `PipelineStep`에 `CLASSIFY`, `VERIFY` 추가. `all` = collect → cluster → classify → summarize → extract → verify → link.
- 단계별 필수 env: classify는 `OPENAI_API_KEY` + `OPENAI_NANO_MODEL`, verify는 `OPENAI_TEXT_MODEL`.
- `--dry-run`: `FakeTextClient`에 classify/verify 고정 응답 추가(`DryRunClients`).
- `regenerateIssue`(관리자 "요약 다시 생성")는 classify를 건너뛰고 summarize → extract → verify → link 순으로 재실행(분류는 유지).

## 5. 관리자 화면 변경 (구현됨)

- 목록 `/admin?status=`: 상태 탭 순서는 **검수 대기 · 초안 · 자동 제외 · 발행됨 · 반려됨**(`IssueStatusTabsView`). 자동 제외 탭이 초안 바로 뒤에 오는 이유는 오탐을 초안과 나란히 확인하기 위해서다.
- 목록 행: 질문 · 기사 수 · 주장 수 · **점수(`debateScore`)** · **주제(`topic`)** · 생성일. 아직 분류되지 않아 값이 없으면 `–`. 질문 옆에는 기존 `검수 경고` 배지에 더해 `classification.duplicateOfIssueId` 가 있으면 **`중복 가능`** 배지를 붙인다(`AdminIssueListItem.hasDuplicateWarning`).
- 검수 폼 상단 **분류 카드**(`IssueClassificationCardView`, 읽기 전용): 점수(큰 숫자)·주제·판정 근거(`reason`)·핵심 문장·핵심 주장·인물/기관 칩·분류/검증 시각. `duplicateOfIssueId` 가 있으면 `/admin/issues/{id}` 로 가는 중복 후보 링크를 함께 보여 준다. `classification` 이 없으면 "아직 분류되지 않음"만 적는다. `classification` Json 이 스키마 검증에 실패해도 폼 전체가 깨지지 않도록 `null` 로 떨어뜨린다(다른 Json 컬럼과 같은 규칙).
- 근거 목록: 검증된 근거에만 판정 배지(`EvidenceSupportBadgeView` — 지지 `--color-agree` / 부분 `--color-brand` / 무관 `--color-muted` / 반박 `--color-disagree`)와 `verificationNote`(12px)를 보여 준다. 미검증(`support = null`)이면 배지가 없다. 무관·반박 근거는 텍스트를 흐리게 두고 `title` 툴팁으로 "앱에는 노출되지 않음"을 알린다. **삭제는 하지 않는다**(기존 삭제 버튼은 그대로).
- **복원**: `AUTO_REJECTED`·`REJECTED` 상세에서만 **"검수 대상으로 복원"** 버튼을 보여 준다(`IssueActionBarView`). 서버 액션 `restoreIssueAction` → `adminUseCases.restoreIssue` → `AdminStore.restoreIssue`.
  - 허용 상태는 `AUTO_REJECTED`·`REJECTED` 뿐이며, 그 밖의 상태는 `AdminActionError(ERROR_NOT_RESTORABLE)` 로 막는다(폼이 조작돼도 서버에서 다시 확인한다).
  - 복원은 `status = DRAFT`, `debateScore = 100`(`RESTORED_DEBATE_SCORE`, 관리자 승격)만 바꾼다. 다음 실행에서 임계값과 무관하게 summarize 대상이 되기 위해서다.
  - **`reviewNote` 와 `classifiedAt` 은 지우지 않는다.** `reviewNote` 는 왜 제외됐는지(`[자동 제외] …`)를 남기는 판단 근거이고, `classifiedAt` 을 지우면 `classify` 가 같은 이슈를 다시 분류해 방금 올린 점수를 원래 값으로 덮어써 복원이 무효가 된다(4.1의 재분류 조건 참고).
  - 성공하면 `AdminMessage.RESTORED` 와 함께 `/admin?status=DRAFT` 로 보낸다. 목록 화면도 `?message=` 를 배너로 읽는다.
- 자동 제외 상태에서 **승인·저장은 기존 규칙 그대로**(승인은 `REVIEW` 만 허용), **요약 다시 생성은 비활성**이며 이유를 버튼 옆 문구와 `title` 툴팁으로 적는다(`REGENERATABLE_STATUSES` = DRAFT·REVIEW).
- `/admin/publishers` 변경 없음.

## 6. 앱 변경
- 없음. 사용자 화면은 PUBLISHED만 읽으므로 `AUTO_REJECTED`·검증 필드는 노출되지 않는다. `IssueMapper`는 `support`가 `UNRELATED`/`CONTRADICTS`인 근거를 **앱 응답에서 제외**한다(관리자가 삭제하지 않았더라도).

## 7. 테스트
- `ClassifySchema`/`VerifySchema` zod 경계, `classifyIssues`(통과/자동 제외/중복 경고/실패 격리, FakePrismaClient), `verifyEvidence`(support 저장, 경고 누적, 삭제하지 않음), `summarizeIssues`·`extractClaims` 대상 조건(임계값·상한·AUTO_REJECTED 제외), `linkSources`의 `verifiedAt` 조건, `IssueMapper` 미지지 근거 제외, `PrismaEnumMappers` `AUTO_REJECTED`, 관리자 복원 use case, `DryRunClients` 고정 응답 스키마 통과, `RunPipeline` 단계 순서·env 요구.

## 8. 비용 가늠 (실행 1회, 이슈 30건 기준)
- classify(nano): 30건 × ~5k 입력 토큰 → 수 센트
- summarize+extract(mini): 상한 10건 × ~8k 입력/3k 출력 → 수십 센트
- verify(mini): 10건 × ~6k → 수십 센트
- 기존(모든 DRAFT를 mini로 처리) 대비 대상이 1/3로 줄어 총비용은 비슷하거나 낮고, 품질(논쟁성·근거 지지) 게이트가 추가된다.

## 9. 범위 밖
자동 병합(중복 이슈 합치기), 투표 데이터 기반 의견 그룹, 스케줄러.

## 10. 실호출 관찰 · 후속 과제 (2026-08-30)
- classify: 29이슈 → 16 통과 / 13 자동 제외. 제외 사유("기업 해외 사업 소식", "인사 발표", "협약 체결")가 정확했다.
- summarize 재생성 후 질문은 전부 찬반형으로 바뀌었다(예: "CPTPP 가입을 추진해야 할까?"). verify는 10이슈에서 미지지 근거 6~7건을 표시했다.
- **후속**: 시드(목 데이터) 이슈는 `centroid`가 비어 있어 cluster 단계에서 배정 대상이 되지 못하고, 같은 주제의 실뉴스가 별도 이슈("주 4.5일제를 도입해야 할까?" 중복)로 생성된다. 시드·승인 시 연결 기사 임베딩 평균으로 `centroid`를 채우거나, classify의 중복 판단에 임베딩 유사도를 보조 신호로 넣는다.
- **후속**: 관리자 화면에 "중복 이슈 병합"(기사·주장을 대상 이슈로 이동) 액션.
