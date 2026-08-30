import { EvidenceType } from '@/domain/EvidenceType';
import { IssueStatus } from '@/domain/IssueStatus';
import { MediaLeaning } from '@/domain/MediaLeaning';

import { parseEvidenceType, parseIssueStatus, parseMediaLeaning } from './adminEnumParsers';

describe('adminEnumParsers', () => {
  it('이슈 상태는 기본값이 REVIEW 다', () => {
    expect(parseIssueStatus('PUBLISHED')).toBe(IssueStatus.PUBLISHED);
    expect(parseIssueStatus('UNKNOWN')).toBe(IssueStatus.REVIEW);
    expect(parseIssueStatus(undefined)).toBe(IssueStatus.REVIEW);
  });

  it('성향은 미지정(null)을 허용한다', () => {
    expect(parseMediaLeaning('CENTRIST')).toBe(MediaLeaning.CENTRIST);
    expect(parseMediaLeaning('')).toBeNull();
    expect(parseMediaLeaning('LEFT')).toBeNull();
  });

  it('근거 타입은 모르는 값이면 null 이다', () => {
    expect(parseEvidenceType('RESEARCH')).toBe(EvidenceType.RESEARCH);
    expect(parseEvidenceType('OPINION')).toBeNull();
  });
});
