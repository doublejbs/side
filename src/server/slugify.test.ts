import { resolveUniqueSlug, slugify } from './slugify';

/** 폴백 slug 형식: `issue-<yyyymmdd>-<6자 해시>`. */
const FALLBACK_PATTERN = /^issue-\d{8}-[0-9a-z]{6}$/;

const FIXED_NOW = new Date('2026-08-30T12:00:00.000Z');

describe('slugify', () => {
  it('한글을 버리고 남은 영문·숫자만 slug 로 쓴다', () => {
    expect(slugify('CPTPP 가입을 추진해야 할까?')).toBe('cptpp');
  });

  it('특수문자를 제거하고 소문자로 만든다', () => {
    expect(slugify('AI 규제, 지금 필요한가?! (2026)')).toBe('ai-2026');
  });

  it('연속 공백·앞뒤 하이픈을 정리한다', () => {
    expect(slugify('  AI   GPU ')).toBe('ai-gpu');
  });

  it('60자를 넘지 않는다', () => {
    const slug = slugify('a'.repeat(80));

    expect(slug).toHaveLength(60);
  });

  it('한글만으로 이루어진 질문은 날짜·해시 폴백을 쓴다', () => {
    expect(slugify('정년을 연장해야 할까?', FIXED_NOW)).toMatch(FALLBACK_PATTERN);
    expect(slugify('정년을 연장해야 할까?', FIXED_NOW).startsWith('issue-20260830-')).toBe(true);
  });

  it('남는 글자가 한 자뿐이어도 폴백을 쓴다', () => {
    expect(slugify('주 4일제를 도입해야 할까?', FIXED_NOW)).toMatch(FALLBACK_PATTERN);
  });

  it('남는 글자가 없으면 폴백을 쓴다', () => {
    expect(slugify('!!!', FIXED_NOW)).toMatch(FALLBACK_PATTERN);
  });

  it('같은 질문·같은 날짜면 폴백 slug 도 같다', () => {
    expect(slugify('정년을 연장해야 할까?', FIXED_NOW)).toBe(
      slugify('정년을 연장해야 할까?', FIXED_NOW),
    );
  });

  it('질문이 다르면 폴백 해시도 다르다', () => {
    expect(slugify('정년을 연장해야 할까?', FIXED_NOW)).not.toBe(
      slugify('원전 비중을 확대해야 할까?', FIXED_NOW),
    );
  });

  it('폴백 slug 는 ASCII 로만 이루어진다', () => {
    expect(slugify('정년을 연장해야 할까?', FIXED_NOW)).toBe(
      encodeURIComponent(slugify('정년을 연장해야 할까?', FIXED_NOW)),
    );
  });
});

describe('resolveUniqueSlug', () => {
  it('비어 있는 slug 는 그대로 쓴다', async () => {
    const slug = await resolveUniqueSlug('retirement-age', async () => false);

    expect(slug).toBe('retirement-age');
  });

  it('중복이면 -2, -3 을 차례로 붙인다', async () => {
    const taken = new Set(['retirement-age', 'retirement-age-2']);
    const slug = await resolveUniqueSlug('retirement-age', async (candidate) => taken.has(candidate));

    expect(slug).toBe('retirement-age-3');
  });

  it('기존 한글 slug 도 그대로 다룬다', async () => {
    const slug = await resolveUniqueSlug('정년-연장', async () => false);

    expect(slug).toBe('정년-연장');
  });
});
