const KST_OFFSET_MINUTES = 9 * 60;

const padTwo = (value: number): string => String(value).padStart(2, '0');

/** 관리자 화면의 날짜 표기(한국 시간 `YYYY.MM.DD`). */
export const formatAdminDate = (date: Date): string => {
  const kst = new Date(date.getTime() + KST_OFFSET_MINUTES * 60 * 1000);

  return `${kst.getUTCFullYear()}.${padTwo(kst.getUTCMonth() + 1)}.${padTwo(kst.getUTCDate())}`;
};
