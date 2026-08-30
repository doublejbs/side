import { createHmac, timingSafeEqual } from 'node:crypto';

const SEPARATOR = '.';

const toBase64Url = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const computeSignature = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

/** 값을 HMAC-SHA256으로 서명해 `payload.signature` 형태의 쿠키 문자열을 만든다. */
export const signCookieValue = (value: string, secret: string): string => {
  const payload = toBase64Url(value);

  return `${payload}${SEPARATOR}${computeSignature(payload, secret)}`;
};

/** 서명된 쿠키 문자열을 검증하고 원래 값을 돌려준다. 위조·손상이면 null. */
export const verifyCookieValue = (signed: string | undefined, secret: string): string | null => {
  if (!signed) {
    return null;
  }

  const separatorIndex = signed.lastIndexOf(SEPARATOR);

  if (separatorIndex <= 0) {
    return null;
  }

  const payload = signed.slice(0, separatorIndex);
  const signature = signed.slice(separatorIndex + 1);
  const expected = computeSignature(payload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  return fromBase64Url(payload);
};
