import { describe, expect, it } from 'vitest';

import { stripCitationMarkers } from '@/pipeline/stripCitationMarkers';

describe('stripCitationMarkers', () => {
  it('문장 끝의 인용 번호를 지운다', () => {
    expect(stripCitationMarkers('법안이 발의됐다 [0].')).toBe('법안이 발의됐다.');
  });

  it('앞에 붙은 인용 번호를 지운다', () => {
    expect(stripCitationMarkers('[0] 법안이 발의됐다.')).toBe('법안이 발의됐다.');
  });

  it('공백 없이 붙은 인용 번호도 지운다', () => {
    expect(stripCitationMarkers('법안이 발의됐다[2]')).toBe('법안이 발의됐다');
  });

  it('여러 번호를 묶은 표기도 지운다', () => {
    expect(stripCitationMarkers('노사 입장이 갈린다 [0, 3, 12].')).toBe('노사 입장이 갈린다.');
  });

  it('한 문장에 여러 번 나와도 모두 지운다', () => {
    expect(stripCitationMarkers('정부는 검토 중이고[1] 국회는 논의 중이다[2].')).toBe(
      '정부는 검토 중이고 국회는 논의 중이다.',
    );
  });

  it('번호를 지운 뒤 겹친 공백을 하나로 정리한다', () => {
    expect(stripCitationMarkers('정부가 [1] 검토 중이다.')).toBe('정부가 검토 중이다.');
  });

  it('앞뒤 공백을 다듬는다', () => {
    expect(stripCitationMarkers('  법안이 발의됐다.  ')).toBe('법안이 발의됐다.');
  });

  it('인용 번호가 없으면 문장을 그대로 둔다', () => {
    expect(stripCitationMarkers('법안이 발의됐다.')).toBe('법안이 발의됐다.');
  });

  it('숫자가 아닌 대괄호 표기는 건드리지 않는다', () => {
    expect(stripCitationMarkers('[재요약] 기사가 늘었다.')).toBe('[재요약] 기사가 늘었다.');
  });

  it('빈 문자열을 그대로 돌려준다', () => {
    expect(stripCitationMarkers('')).toBe('');
  });
});
