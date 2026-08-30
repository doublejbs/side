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
- 대상 조건에 `debateScore >= threshold` 추가, `debateScore desc` 정렬 후 `PIPELINE_EXPOSE_LIMIT`개까지만 처리(`--issue` 지정 시 제한 무시, 단 AUTO_REJECTED는 제외).
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

## 5. 관리자 화면 변경
- 목록: 상태 탭에 **자동 제외** 추가(`AUTO_REJECTED`). 행에 `debateScore`·`topic` 컬럼, 중복 경고 배지.
- 자동 제외 이슈 상세에서 **"검수 대상으로 복원"** 버튼(→ DRAFT, `reviewNote` 유지) — 오탐 복구용. 복원된 이슈는 다음 실행에서 임계값과 무관하게 summarize 대상(관리자 승격 = `debateScore`를 `100`으로 설정).
- 검수 폼 상단에 분류 카드: 점수·주제·판정 근거·핵심 문장·핵심 주장·인물/기관(읽기 전용).
- 근거 목록에 검증 배지(지지/부분/무관/반박)와 note 표시, 무관·반박은 회색 처리(삭제는 기존 버튼).
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
