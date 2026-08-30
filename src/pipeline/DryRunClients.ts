import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { CLASSIFY_SCHEMA_NAME } from '@/pipeline/ClassifySchema';
import { EXTRACT_SCHEMA_NAME } from '@/pipeline/ExtractSchema';
import { createFakeTextClient } from '@/pipeline/FakeTextClient';
import type { NaverNewsClient } from '@/pipeline/NaverNewsClient';
import { SUMMARIZE_SCHEMA_NAME } from '@/pipeline/SummarizeSchema';
import type { TextClient } from '@/pipeline/TextClient';
import { VERIFY_SCHEMA_NAME } from '@/pipeline/VerifySchema';

/**
 * `--dry-run` 이 쓰는 가짜 클라이언트 모음.
 * 외부 호출 없이 파이프라인 전체가 도는지만 확인하는 용도이며, 내용은 자리표시자다.
 */

const DRY_RUN_CLASSIFICATION = {
  isPolicyDebate: true,
  debateScore: 70,
  topic: '시험',
  reason: 'dry-run 실행에서 만든 자리표시자 판정이다.',
  entities: ['자리표시자 기관'],
  keySentences: [
    '이것은 dry-run 이 만든 자리표시자 쟁점 문장이다.',
    '실제 모델을 호출하지 않았다.',
    '검수 화면에서 반드시 다시 생성해야 한다.',
  ],
  keyClaims: ['자리표시자 주장 1', '자리표시자 주장 2', '자리표시자 주장 3'],
  duplicateOfIssueId: null,
};

const DRY_RUN_SUMMARY = {
  question: '이 제도를 도입해야 할까?',
  tags: ['시험', '자리표시자'],
  summary: [
    '이것은 dry-run 실행에서 만든 자리표시자 요약이다.',
    '실제 모델을 호출하지 않았다.',
    '검수 화면에서 반드시 다시 생성해야 한다.',
  ],
  keyPoints: [
    { title: '자리표시자 1', question: '실제 쟁점은 무엇일까?' },
    { title: '자리표시자 2', question: '어떤 근거가 필요할까?' },
    { title: '자리표시자 3', question: '누가 영향을 받을까?' },
    { title: '자리표시자 4', question: '비용은 얼마나 들까?' },
  ],
};

const dryRunClaim = (side: ClaimSide, order: number) => ({
  side,
  title: `${side === ClaimSide.AGREE ? '찬성' : '반대'} 자리표시자 주장 ${order}`,
  description: 'dry-run 실행에서 만든 자리표시자 설명이다. 실제 모델 응답이 아니다.',
  evidences: [
    { articleIndex: 0, type: EvidenceType.FACT, summary: '자리표시자 근거 1' },
    { articleIndex: 1, type: EvidenceType.CLAIM, summary: '자리표시자 근거 2' },
  ],
});

const dryRunGroup = (share: number) => ({
  label: '자리표시자 그룹',
  share,
  description: 'dry-run 실행에서 만든 자리표시자 그룹 설명이다.',
  agreesWith: [0],
  disagreesWith: [3],
  mostDivided: [1],
});

const DRY_RUN_EXTRACT = {
  claims: [
    dryRunClaim(ClaimSide.AGREE, 1),
    dryRunClaim(ClaimSide.AGREE, 2),
    dryRunClaim(ClaimSide.AGREE, 3),
    dryRunClaim(ClaimSide.DISAGREE, 1),
    dryRunClaim(ClaimSide.DISAGREE, 2),
    dryRunClaim(ClaimSide.DISAGREE, 3),
  ],
  mediaPerspectives: [],
  commonCoverage: ['자리표시자 공통 내용 1', '자리표시자 공통 내용 2'],
  opinionGroups: [dryRunGroup(34), dryRunGroup(33), dryRunGroup(33)],
};

/**
 * 근거 검증은 입력으로 받은 근거 id 를 알아야 하지만, dry-run 은 외부 호출 없이 도는지만 본다.
 * 존재하지 않는 id 는 `verifyEvidence` 가 버리므로 자리표시자 판정 하나만 돌려준다.
 */
const DRY_RUN_VERIFY = {
  verdicts: [
    {
      evidenceId: 'dry-run-evidence',
      support: EvidenceSupport.SUPPORTS,
      type: EvidenceType.FACT,
      note: 'dry-run 실행에서 만든 자리표시자 판정이다.',
    },
  ],
};

/** 고정 응답만 돌려주는 텍스트 클라이언트. */
export const createDryRunTextClient = (): TextClient =>
  createFakeTextClient({
    [CLASSIFY_SCHEMA_NAME]: [DRY_RUN_CLASSIFICATION],
    [SUMMARIZE_SCHEMA_NAME]: [DRY_RUN_SUMMARY],
    [EXTRACT_SCHEMA_NAME]: [DRY_RUN_EXTRACT],
    [VERIFY_SCHEMA_NAME]: [DRY_RUN_VERIFY],
  });

/** 네트워크를 쓰지 않는 뉴스 클라이언트. 항상 빈 결과를 돌려준다. */
export const createDryRunNewsClient = (): NaverNewsClient => ({
  search: async () => [],
});
