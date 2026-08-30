/**
 * 매체 도메인 → 매체명 초기 시드 테이블.
 *
 * 성향(`leaning`)은 여기에 두지 않는다. 성향은 `Publisher` 테이블에 저장하고
 * 관리자가 `/admin/publishers` 에서 직접 지정한다(코드가 매체를 평가하지 않는다).
 */
export interface PublisherDirectoryEntry {
  domain: string;
  name: string;
}

export const PUBLISHER_DIRECTORY: PublisherDirectoryEntry[] = [
  // 종합 일간지
  { domain: 'chosun.com', name: '조선일보' },
  { domain: 'joongang.co.kr', name: '중앙일보' },
  { domain: 'donga.com', name: '동아일보' },
  { domain: 'hani.co.kr', name: '한겨레' },
  { domain: 'khan.co.kr', name: '경향신문' },
  { domain: 'hankookilbo.com', name: '한국일보' },
  { domain: 'seoul.co.kr', name: '서울신문' },
  { domain: 'segye.com', name: '세계일보' },
  { domain: 'kmib.co.kr', name: '국민일보' },
  { domain: 'munhwa.com', name: '문화일보' },
  // 방송
  { domain: 'kbs.co.kr', name: 'KBS' },
  { domain: 'imnews.imbc.com', name: 'MBC' },
  { domain: 'news.sbs.co.kr', name: 'SBS' },
  { domain: 'ytn.co.kr', name: 'YTN' },
  { domain: 'news.jtbc.co.kr', name: 'JTBC' },
  // 통신사
  { domain: 'yna.co.kr', name: '연합뉴스' },
  { domain: 'newsis.com', name: '뉴시스' },
  { domain: 'news1.kr', name: '뉴스1' },
  // 경제지
  { domain: 'hankyung.com', name: '한국경제' },
  { domain: 'mk.co.kr', name: '매일경제' },
  { domain: 'sedaily.com', name: '서울경제' },
  { domain: 'edaily.co.kr', name: '이데일리' },
];

const NAME_BY_DOMAIN = new Map(PUBLISHER_DIRECTORY.map((entry) => [entry.domain, entry.name]));

/** URL 이든 도메인이든 비교 가능한 형태(소문자·`www.` 제거·끝점 제거)로 만든다. */
export const normalizeDomain = (value: string): string => {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.length === 0) {
    return '';
  }

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  const host = withoutScheme.split(/[/?#]/)[0];

  return host.replace(/^www\./, '').replace(/\.$/, '');
};

/** 등록된 매체명을 반환한다. 테이블에 없으면 도메인 문자열을 그대로 쓴다. */
export const resolvePublisherName = (value: string): string => {
  const domain = normalizeDomain(value);

  return NAME_BY_DOMAIN.get(domain) ?? domain;
};
