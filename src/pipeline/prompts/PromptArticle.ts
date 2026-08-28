/** 프롬프트에 넣는 기사 한 건. `index` 는 입력 배열의 위치이며 근거 인용 키로 쓴다. */
export interface PromptArticle {
  index: number;
  /** 매체명. 없으면 도메인 문자열. */
  publisher: string;
  publishedAt: Date;
  title: string;
  description: string;
}

const KST_OFFSET_MINUTES = 9 * 60;

const padTwo = (value: number): string => String(value).padStart(2, '0');

/** 한국 시간 기준 `YYYY.MM.DD`. 화면의 근거 날짜 표기와 같은 형식이다. */
export const formatPromptDate = (date: Date): string => {
  const kst = new Date(date.getTime() + KST_OFFSET_MINUTES * 60 * 1000);

  return `${kst.getUTCFullYear()}.${padTwo(kst.getUTCMonth() + 1)}.${padTwo(kst.getUTCDate())}`;
};

/** `[0] 매체 · 날짜 · 제목 — 설명` 한 줄. */
export const formatPromptArticle = (article: PromptArticle): string =>
  `[${article.index}] ${article.publisher} · ${formatPromptDate(article.publishedAt)} · ${article.title} — ${article.description}`;

export const formatPromptArticles = (articles: PromptArticle[]): string =>
  articles.map(formatPromptArticle).join('\n');
