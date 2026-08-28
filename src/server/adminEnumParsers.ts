import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';

const isMember = <T extends Record<string, string>>(
  candidates: T,
  value: string | null | undefined,
): value is T[keyof T] => Boolean(value) && Object.values(candidates).includes(value as T[keyof T]);

/** 쿼리 파라미터·폼 값에서 이슈 상태를 읽는다. 값이 없거나 이상하면 기본값(REVIEW). */
export const parseIssueStatus = (value: string | null | undefined): IssueStatus =>
  isMember(IssueStatus, value) ? value : IssueStatus.REVIEW;

/** 성향은 '미지정'(null)을 허용한다. */
export const parseMediaLeaning = (value: string | null | undefined): MediaLeaning | null =>
  isMember(MediaLeaning, value) ? value : null;

export const parseEvidenceType = (value: string | null | undefined): EvidenceType | null =>
  isMember(EvidenceType, value) ? value : null;
