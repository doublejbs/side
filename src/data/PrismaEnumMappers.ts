import {
  ClaimFeedback as PrismaClaimFeedback,
  ClaimSide as PrismaClaimSide,
  EvidenceSupport as PrismaEvidenceSupport,
  EvidenceType as PrismaEvidenceType,
  IssueStatus as PrismaIssueStatus,
  MediaLeaning as PrismaMediaLeaning,
  VoteChoice as PrismaVoteChoice,
} from '@prisma/client';

import { UnknownEnumValueError } from '@/data/UnknownEnumValueError';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { VoteChoice } from '@/domain/VoteChoice';

/**
 * Prisma enum 과 도메인 enum 은 값이 같은 string enum 이지만 타입이 다르다.
 * 파일마다 `Record<A, B>` 표를 새로 쓰지 않도록, 값이 목록에 있는지 확인하고 옮기는 함수를 한곳에 모은다.
 * 값이 어긋나면 `UnknownEnumValueError` 를 던져 스키마 변경 누락을 드러낸다.
 */
const createEnumMapper = <Target extends string>(
  enumName: string,
  targetEnum: Record<string, Target>,
): ((value: string) => Target) => {
  const allowed = new Set<string>(Object.values(targetEnum));

  return (value: string): Target => {
    if (!allowed.has(value)) {
      throw new UnknownEnumValueError(enumName, value);
    }

    return value as Target;
  };
};

export const toDomainIssueStatus = createEnumMapper('IssueStatus', IssueStatus);

export const toPrismaIssueStatus = createEnumMapper('IssueStatus', PrismaIssueStatus);

export const toDomainClaimSide = createEnumMapper('ClaimSide', ClaimSide);

export const toPrismaClaimSide = createEnumMapper('ClaimSide', PrismaClaimSide);

export const toDomainEvidenceType = createEnumMapper('EvidenceType', EvidenceType);

export const toPrismaEvidenceType = createEnumMapper('EvidenceType', PrismaEvidenceType);

export const toDomainEvidenceSupport = createEnumMapper('EvidenceSupport', EvidenceSupport);

export const toPrismaEvidenceSupport = createEnumMapper('EvidenceSupport', PrismaEvidenceSupport);

export const toDomainMediaLeaning = createEnumMapper('MediaLeaning', MediaLeaning);

export const toPrismaMediaLeaning = createEnumMapper('MediaLeaning', PrismaMediaLeaning);

export const toDomainVoteChoice = createEnumMapper('VoteChoice', VoteChoice);

export const toPrismaVoteChoice = createEnumMapper('VoteChoice', PrismaVoteChoice);

export const toDomainClaimFeedback = createEnumMapper('ClaimFeedback', ClaimFeedback);

export const toPrismaClaimFeedback = createEnumMapper('ClaimFeedback', PrismaClaimFeedback);
