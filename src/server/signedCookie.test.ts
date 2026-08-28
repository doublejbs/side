import { signCookieValue, verifyCookieValue } from './signedCookie';

const SECRET = 'test-secret';

describe('signedCookie', () => {
  it('서명한 값을 같은 비밀키로 검증하면 원래 값을 돌려준다', () => {
    const signed = signCookieValue('anon-123', SECRET);

    expect(verifyCookieValue(signed, SECRET)).toBe('anon-123');
  });

  it('다른 비밀키로는 검증에 실패한다', () => {
    const signed = signCookieValue('anon-123', SECRET);

    expect(verifyCookieValue(signed, 'other')).toBeNull();
  });

  it('페이로드가 변조되면 null을 반환한다', () => {
    const signed = signCookieValue('anon-123', SECRET);
    const [, signature] = signed.split('.');
    const tampered = `${Buffer.from('anon-999').toString('base64url')}.${signature}`;

    expect(verifyCookieValue(tampered, SECRET)).toBeNull();
  });

  it('형식이 잘못되거나 비어 있으면 null을 반환한다', () => {
    expect(verifyCookieValue(undefined, SECRET)).toBeNull();
    expect(verifyCookieValue('', SECRET)).toBeNull();
    expect(verifyCookieValue('no-separator', SECRET)).toBeNull();
  });
});
