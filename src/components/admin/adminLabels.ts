import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  [IssueStatus.DRAFT]: '초안',
  [IssueStatus.REVIEW]: '검수 대기',
  [IssueStatus.PUBLISHED]: '발행됨',
  [IssueStatus.REJECTED]: '반려됨',
  [IssueStatus.AUTO_REJECTED]: '자동 제외',
};

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  [EvidenceType.FACT]: '사실',
  [EvidenceType.RESEARCH]: '연구',
  [EvidenceType.EXPERT]: '전문가',
  [EvidenceType.CLAIM]: '주장',
};

export const EVIDENCE_SUPPORT_LABEL: Record<EvidenceSupport, string> = {
  [EvidenceSupport.SUPPORTS]: '지지',
  [EvidenceSupport.PARTIAL]: '부분',
  [EvidenceSupport.UNRELATED]: '무관',
  [EvidenceSupport.CONTRADICTS]: '반박',
};

export const MEDIA_LEANING_LABEL: Record<MediaLeaning, string> = {
  [MediaLeaning.PROGRESSIVE]: '진보',
  [MediaLeaning.CENTRIST]: '중도',
  [MediaLeaning.CONSERVATIVE]: '보수',
};

/** 성향 미지정을 나타내는 `<select>` 값. 빈 문자열이라 파서가 null 로 읽는다. */
export const UNSET_LEANING_VALUE = '';

export const UNSET_LEANING_LABEL = '미지정';
