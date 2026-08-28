import { formatAdminDate } from './formatAdminDate';

describe('formatAdminDate', () => {
  it('한국 시간 기준으로 YYYY.MM.DD 를 만든다', () => {
    expect(formatAdminDate(new Date('2026-01-05T00:00:00.000Z'))).toBe('2026.01.05');
  });

  it('UTC 로 전날이어도 한국 시간 날짜로 보여준다', () => {
    expect(formatAdminDate(new Date('2026-01-05T16:00:00.000Z'))).toBe('2026.01.06');
  });
});
