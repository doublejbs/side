import { AxisDirection } from '@/domain/AxisDirection';
import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

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

/** 관점 축은 '미지정'(null)을 허용한다. 근거: docs/PerspectiveSpec.md 1장. */
export const parsePerspectiveAxis = (value: string | null | undefined): PerspectiveAxis | null =>
  isMember(PerspectiveAxis, value) ? value : null;

/** 찬성 방향은 값이 없거나 이상하면 왼쪽으로 둔다(폼의 첫 선택지). */
export const parseAxisDirection = (value: string | null | undefined): AxisDirection =>
  isMember(AxisDirection, value) ? value : AxisDirection.LEFT;
