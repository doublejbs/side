import { isSafeHttpUrl } from './isSafeHttpUrl';

describe('isSafeHttpUrl', () => {
  it('http·https 주소만 허용한다', () => {
    expect(isSafeHttpUrl('https://example.com/news/1')).toBe(true);
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
    expect(isSafeHttpUrl('  https://example.com  ')).toBe(true);
  });

  it('실행 가능한 스킴은 거부한다', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('JavaScript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
  });

  it('파싱할 수 없는 값과 빈 문자열은 거부한다', () => {
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl('   ')).toBe(false);
    expect(isSafeHttpUrl('example.com')).toBe(false);
    expect(isSafeHttpUrl('//example.com')).toBe(false);
  });
});
