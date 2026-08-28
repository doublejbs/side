import { describe, expect, it } from 'vitest';

import {
  formatPromptArticle,
  formatPromptArticles,
  formatPromptDate,
  type PromptArticle,
} from '@/pipeline/prompts/PromptArticle';

const article: PromptArticle = {
  index: 0,
  publisher: '한겨레',
  publishedAt: new Date('2026-08-20T01:00:00.000Z'),
  title: '주 4.5일제 법안 발의',
  description: '국회에서 법안이 발의됐다.',
};

describe('formatPromptDate', () => {
  it('한국 시간 기준 YYYY.MM.DD 로 만든다', () => {
    expect(formatPromptDate(new Date('2026-08-20T01:00:00.000Z'))).toBe('2026.08.20');
  });

  it('UTC 자정 직전은 다음 날로 넘어간다', () => {
    expect(formatPromptDate(new Date('2026-08-20T23:00:00.000Z'))).toBe('2026.08.21');
  });
});

describe('formatPromptArticle', () => {
  it('[인덱스] 매체 · 날짜 · 제목 — 설명 형식으로 만든다', () => {
    expect(formatPromptArticle(article)).toBe(
      '[0] 한겨레 · 2026.08.20 · 주 4.5일제 법안 발의 — 국회에서 법안이 발의됐다.',
    );
  });
});

describe('formatPromptArticles', () => {
  it('기사마다 한 줄씩 이어 붙인다', () => {
    const lines = formatPromptArticles([article, { ...article, index: 1, publisher: '조선일보' }]).split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('[1] 조선일보');
  });
});
