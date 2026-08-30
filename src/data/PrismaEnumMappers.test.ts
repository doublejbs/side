import {
  ClaimFeedback as PrismaClaimFeedback,
  ClaimSide as PrismaClaimSide,
  EvidenceSupport as PrismaEvidenceSupport,
  EvidenceType as PrismaEvidenceType,
  IssueStatus as PrismaIssueStatus,
  MediaLeaning as PrismaMediaLeaning,
  VoteChoice as PrismaVoteChoice,
} from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  toDomainClaimFeedback,
  toDomainClaimSide,
  toDomainEvidenceSupport,
  toDomainEvidenceType,
  toDomainIssueStatus,
  toDomainMediaLeaning,
  toDomainVoteChoice,
  toPrismaClaimFeedback,
  toPrismaClaimSide,
  toPrismaEvidenceSupport,
  toPrismaEvidenceType,
  toPrismaIssueStatus,
  toPrismaMediaLeaning,
  toPrismaVoteChoice,
} from '@/data/PrismaEnumMappers';
import { UnknownEnumValueError } from '@/data/UnknownEnumValueError';
import { ClaimFeedback } from '@/domain/ClaimFeedback';
import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceSupport } from '@/domain/EvidenceSupport';
import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { VoteChoice } from '@/domain/VoteChoice';

const sortedValues = (source: Record<string, string>): string[] => Object.values(source).sort();

const PAIRS = [
  { name: 'IssueStatus', domain: IssueStatus, prisma: PrismaIssueStatus },
  { name: 'ClaimSide', domain: ClaimSide, prisma: PrismaClaimSide },
  { name: 'EvidenceType', domain: EvidenceType, prisma: PrismaEvidenceType },
  { name: 'EvidenceSupport', domain: EvidenceSupport, prisma: PrismaEvidenceSupport },
  { name: 'MediaLeaning', domain: MediaLeaning, prisma: PrismaMediaLeaning },
  { name: 'VoteChoice', domain: VoteChoice, prisma: PrismaVoteChoice },
  { name: 'ClaimFeedback', domain: ClaimFeedback, prisma: PrismaClaimFeedback },
];

describe('PrismaEnumMappers', () => {
  it.each(PAIRS)('$name 은 도메인과 Prisma 의 값 목록이 같다', ({ domain, prisma }) => {
    expect(sortedValues(domain)).toEqual(sortedValues(prisma));
  });

  it('Prisma 값을 도메인 enum 으로 옮긴다', () => {
    expect(toDomainIssueStatus(PrismaIssueStatus.PUBLISHED)).toBe(IssueStatus.PUBLISHED);
    expect(toDomainClaimSide(PrismaClaimSide.DISAGREE)).toBe(ClaimSide.DISAGREE);
    expect(toDomainEvidenceType(PrismaEvidenceType.RESEARCH)).toBe(EvidenceType.RESEARCH);
    expect(toDomainEvidenceSupport(PrismaEvidenceSupport.PARTIAL)).toBe(EvidenceSupport.PARTIAL);
    expect(toDomainIssueStatus(PrismaIssueStatus.AUTO_REJECTED)).toBe(IssueStatus.AUTO_REJECTED);
    expect(toDomainMediaLeaning(PrismaMediaLeaning.CENTRIST)).toBe(MediaLeaning.CENTRIST);
    expect(toDomainVoteChoice(PrismaVoteChoice.UNSURE)).toBe(VoteChoice.UNSURE);
    expect(toDomainClaimFeedback(PrismaClaimFeedback.PERSUADED)).toBe(ClaimFeedback.PERSUADED);
  });

  it('도메인 값을 Prisma enum 으로 옮긴다', () => {
    expect(toPrismaIssueStatus(IssueStatus.REVIEW)).toBe(PrismaIssueStatus.REVIEW);
    expect(toPrismaClaimSide(ClaimSide.AGREE)).toBe(PrismaClaimSide.AGREE);
    expect(toPrismaEvidenceType(EvidenceType.EXPERT)).toBe(PrismaEvidenceType.EXPERT);
    expect(toPrismaEvidenceSupport(EvidenceSupport.CONTRADICTS)).toBe(
      PrismaEvidenceSupport.CONTRADICTS,
    );
    expect(toPrismaIssueStatus(IssueStatus.AUTO_REJECTED)).toBe(PrismaIssueStatus.AUTO_REJECTED);
    expect(toPrismaMediaLeaning(MediaLeaning.PROGRESSIVE)).toBe(PrismaMediaLeaning.PROGRESSIVE);
    expect(toPrismaVoteChoice(VoteChoice.DISAGREE)).toBe(PrismaVoteChoice.DISAGREE);
    expect(toPrismaClaimFeedback(ClaimFeedback.LACKS_EVIDENCE)).toBe(
      PrismaClaimFeedback.LACKS_EVIDENCE,
    );
  });

  it('목록에 없는 값은 UnknownEnumValueError 로 막는다', () => {
    expect(() => toDomainIssueStatus('ARCHIVED')).toThrow(UnknownEnumValueError);
    expect(() => toDomainVoteChoice('MAYBE')).toThrow('알 수 없는 VoteChoice 값입니다: MAYBE');
  });
});
