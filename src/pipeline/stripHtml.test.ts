import { describe, expect, it } from 'vitest';

import { stripHtml } from '@/pipeline/stripHtml';

describe('stripHtml', () => {
  it('HTML 태그를 제거한다', () => {
    expect(stripHtml('<b>예산안</b> 처리 무산')).toBe('예산안 처리 무산');
  });

  it('명명 엔티티를 디코드한다', () => {
    expect(stripHtml('&quot;합의&quot; &amp; &lt;논의&gt; &#39;재개&apos;')).toBe(
      '"합의" & <논의> \'재개\'',
    );
  });

  it('&nbsp; 는 일반 공백으로 바꾼다', () => {
    expect(stripHtml('국회&nbsp;본회의')).toBe('국회 본회의');
  });

  it('숫자 엔티티를 디코드한다', () => {
    expect(stripHtml('&#54620;&#xAC00;')).toBe('한가');
  });

  it('알 수 없는 엔티티는 그대로 둔다', () => {
    expect(stripHtml('&unknown; 표기')).toBe('&unknown; 표기');
  });

  it('연속 공백·줄바꿈을 하나로 줄이고 앞뒤 공백을 없앤다', () => {
    expect(stripHtml('  국회\n\n 본회의   개회  ')).toBe('국회 본회의 개회');
  });

  it('태그 제거로 단어가 붙지 않는다', () => {
    expect(stripHtml('여야<b>합의</b>불발')).toBe('여야 합의 불발');
  });

  it('빈 문자열은 빈 문자열이다', () => {
    expect(stripHtml('')).toBe('');
  });
});
