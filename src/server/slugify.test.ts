import { resolveUniqueSlug, slugify } from './slugify';

describe('slugify', () => {
  it('한글을 유지하고 공백을 하이픈으로 바꾼다', () => {
    expect(slugify('주 4일제를 도입해야 할까?')).toBe('주-4일제를-도입해야-할까');
  });

  it('특수문자를 제거하고 소문자로 만든다', () => {
    expect(slugify('AI 규제, 지금 필요한가?! (2026)')).toBe('ai-규제-지금-필요한가-2026');
  });

  it('연속 공백·앞뒤 하이픈을 정리한다', () => {
    expect(slugify('  정년   연장 ')).toBe('정년-연장');
  });

  it('60자를 넘지 않는다', () => {
    const slug = slugify('가'.repeat(80));

    expect(slug).toHaveLength(60);
  });

  it('남는 글자가 없으면 기본값을 쓴다', () => {
    expect(slugify('!!!')).toBe('issue');
  });
});

describe('resolveUniqueSlug', () => {
  it('비어 있는 slug 는 그대로 쓴다', async () => {
    const slug = await resolveUniqueSlug('정년-연장', async () => false);

    expect(slug).toBe('정년-연장');
  });

  it('중복이면 -2, -3 을 차례로 붙인다', async () => {
    const taken = new Set(['정년-연장', '정년-연장-2']);
    const slug = await resolveUniqueSlug('정년-연장', async (candidate) => taken.has(candidate));

    expect(slug).toBe('정년-연장-3');
  });
});
