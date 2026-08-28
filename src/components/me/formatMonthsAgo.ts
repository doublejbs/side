const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
/** 그레고리력 평균 한 달 길이(일). */
const DAYS_PER_MONTH = 30.44;

/** 두 시각의 간격을 "N개월 전"으로 표기한다. 한 달 미만이거나 계산할 수 없으면 "이전". */
export const formatMonthsAgo = (fromIso: string, toIso: string): string => {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();

  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
    return '이전';
  }

  const months = Math.round((to - from) / MILLISECONDS_PER_DAY / DAYS_PER_MONTH);

  if (months < 1) {
    return '이전';
  }

  return `${months}개월 전`;
};
