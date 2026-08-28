import { describe, expect, it } from 'vitest';

import { formatMonthsAgo } from '@/components/me/formatMonthsAgo';
import { OPINION_CHANGES } from '@/data/perspectiveData';

describe('formatMonthsAgo', () => {
  it('의견 변화 목 데이터는 3개월 전으로 표기된다', () => {
    const change = OPINION_CHANGES[0];

    expect(formatMonthsAgo(change.before.votedAt, change.after.votedAt)).toBe('3개월 전');
  });

  it('한 달 미만 간격은 "이전"으로 표기한다', () => {
    expect(
      formatMonthsAgo('2026-08-01T00:00:00.000Z', '2026-08-05T00:00:00.000Z'),
    ).toBe('이전');
  });

  it('순서가 뒤바뀌었거나 잘못된 값이면 "이전"으로 표기한다', () => {
    expect(
      formatMonthsAgo('2026-08-05T00:00:00.000Z', '2026-08-01T00:00:00.000Z'),
    ).toBe('이전');
    expect(formatMonthsAgo('없는 날짜', '2026-08-01T00:00:00.000Z')).toBe('이전');
  });
});
