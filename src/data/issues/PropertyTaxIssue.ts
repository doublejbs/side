import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import type { Issue } from '@/domain/Issue';

export const propertyTaxIssue: Issue = {
  id: 'property-tax',
  slug: 'property-tax',
  question: '부동산 보유세를 강화해야 할까?',
  tags: ['부동산', '경제'],
  participantCount: 4760,
  distribution: { agree: 41, disagree: 46, unsure: 13 },
  summary: [
    '부동산 보유세 강화 여부를 두고 국회와 정부에서 논의가 다시 이어지고 있다.',
    '논의의 핵심은 세 부담을 어디까지 늘리고 그 부담을 누가 지게 되는지다.',
    '강화 측은 자산 격차 완화와 지방 재정 확충 효과를 주장한다.',
    '반대 측은 실거주자의 부담과 거래 위축 가능성을 우려한다.',
  ],
  sourceArticleCount: 14,
  mediaOutletCount: 9,
  coveragePeriodLabel: '최근 한 달',
  keyPoints: [
    {
      id: 'property-tax-kp-1',
      title: '세 부담',
      question: '보유세를 강화하면 누구의 부담이 얼마나 늘어나는가?',
    },
    {
      id: 'property-tax-kp-2',
      title: '집값',
      question: '보유세 강화가 주택 가격에 실제로 영향을 주는가?',
    },
    {
      id: 'property-tax-kp-3',
      title: '거래 위축',
      question: '세 부담 증가가 주택 거래를 줄이지는 않는가?',
    },
    {
      id: 'property-tax-kp-4',
      title: '지방 재정',
      question: '늘어난 세수가 지방 재정에 어떻게 쓰이는가?',
    },
  ],
  claims: [
    {
      id: 'property-tax-agree-1',
      side: ClaimSide.AGREE,
      title: '자산 격차를 완화하는 수단이 될 수 있다',
      description:
        '소득보다 자산에서 격차가 더 크게 벌어지고 있다는 문제 제기다. 보유 자산의 규모에 맞춰 세금을 매기면 격차 확대 속도를 늦출 수 있다는 주장이다. 근로소득에 치우친 과세 구조를 조정하자는 논의와도 맞닿아 있다.',
      persuadedCount: 1570,
      evidences: [
        {
          id: 'property-tax-agree-1-ev-1',
          type: EvidenceType.FACT,
          source: '국회 예산정책처',
          date: '2026.07.09',
          summary:
            '가계 자산에서 부동산이 차지하는 비중이 주요국 평균보다 높은 수준으로 집계됐다.',
          url: 'https://example.com/property-tax/asset-composition',
        },
        {
          id: 'property-tax-agree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '조세재정연구기관 보고서',
          date: '2026.07.21',
          summary:
            '자산 상위 구간의 부동산 보유 집중도가 지난 10년간 완만하게 높아졌다고 분석했다.',
          url: 'https://example.com/property-tax/wealth-concentration',
        },
        {
          id: 'property-tax-agree-1-ev-3',
          type: EvidenceType.EXPERT,
          source: '조세법 교수 인터뷰',
          date: '2026.08.03',
          summary:
            '보유세는 자산 격차에 직접 대응할 수 있는 몇 안 되는 세목이라고 설명했다.',
          url: 'https://example.com/property-tax/tax-law-interview',
        },
        {
          id: 'property-tax-agree-1-ev-4',
          type: EvidenceType.CLAIM,
          source: '주택 관련 시민단체 성명',
          date: '2026.08.10',
          summary:
            '보유세 강화를 자산 불평등 완화 과제로 규정하고 제도 개편을 요구했다.',
          url: 'https://example.com/property-tax/civic-statement',
        },
      ],
    },
    {
      id: 'property-tax-agree-2',
      side: ClaimSide.AGREE,
      title: '투기 수요를 줄이는 효과를 기대할 수 있다',
      description:
        '보유 비용이 낮으면 실거주 목적이 아닌 주택 보유가 늘어난다는 지적이다. 보유세를 높이면 여러 채를 오래 들고 있을 유인이 줄어들 수 있다는 주장이다.',
      persuadedCount: 1180,
      evidences: [
        {
          id: 'property-tax-agree-2-ev-1',
          type: EvidenceType.RESEARCH,
          source: '조세재정연구기관 보고서',
          date: '2026.07.17',
          summary:
            '보유세 실효세율이 높은 국가에서 주택 가격 변동폭이 상대적으로 작게 나타났다고 정리했다.',
          url: 'https://example.com/property-tax/effective-rate-study',
        },
        {
          id: 'property-tax-agree-2-ev-2',
          type: EvidenceType.FACT,
          source: '부동산 통계 자료',
          date: '2026.07.28',
          summary:
            '다주택 보유 가구의 비중이 최근 몇 년간 큰 변화 없이 유지되고 있는 것으로 집계됐다.',
          url: 'https://example.com/property-tax/multi-home-stats',
        },
        {
          id: 'property-tax-agree-2-ev-3',
          type: EvidenceType.EXPERT,
          source: '도시경제학 교수 기고',
          date: '2026.08.07',
          summary:
            '보유세가 거래세보다 시장 왜곡이 적은 과세 방식이라고 평가했다.',
          url: 'https://example.com/property-tax/urban-economics-column',
        },
      ],
    },
    {
      id: 'property-tax-agree-3',
      side: ClaimSide.AGREE,
      title: '지방 재정을 안정적으로 뒷받침할 수 있다',
      description:
        '보유세는 경기 변동에 덜 민감해 지방자치단체의 재원으로 활용하기 적합하다는 평가가 있다. 늘어난 세수를 지역 주거 복지와 기반 시설에 쓰자는 제안도 함께 나온다.',
      persuadedCount: 830,
      evidences: [
        {
          id: 'property-tax-agree-3-ev-1',
          type: EvidenceType.FACT,
          source: '지방재정 통계 자료',
          date: '2026.07.24',
          summary:
            '재정자립도가 낮은 지방자치단체의 비중이 여전히 높은 수준으로 나타났다.',
          url: 'https://example.com/property-tax/local-finance-stats',
        },
        {
          id: 'property-tax-agree-3-ev-2',
          type: EvidenceType.CLAIM,
          source: '지방자치단체 협의회 입장문',
          date: '2026.08.14',
          summary:
            '보유세 세수의 지방 이양 확대를 전제로 제도 개편에 찬성한다고 밝혔다.',
          url: 'https://example.com/property-tax/local-council-statement',
        },
      ],
    },
    {
      id: 'property-tax-disagree-1',
      side: ClaimSide.DISAGREE,
      title: '실거주자의 부담이 함께 늘어난다',
      description:
        '집 한 채를 오래 보유한 가구는 소득이 늘지 않아도 세금만 늘어날 수 있다는 우려다. 은퇴 이후 고정 수입이 적은 가구일수록 부담을 감당하기 어렵다는 지적이 이어진다. 자산 규모와 실제 지불 능력이 일치하지 않는다는 문제 제기다.',
      persuadedCount: 1740,
      evidences: [
        {
          id: 'property-tax-disagree-1-ev-1',
          type: EvidenceType.FACT,
          source: '가계금융 조사 자료',
          date: '2026.07.11',
          summary:
            '고령 가구의 자산 대부분이 거주 주택에 묶여 있는 것으로 집계됐다.',
          url: 'https://example.com/property-tax/household-finance-survey',
        },
        {
          id: 'property-tax-disagree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '조세재정연구기관 보고서',
          date: '2026.07.26',
          summary:
            '보유세율 인상 시 1주택 장기 보유 가구의 세 부담 증가폭을 소득 구간별로 추정했다.',
          url: 'https://example.com/property-tax/burden-simulation',
        },
        {
          id: 'property-tax-disagree-1-ev-3',
          type: EvidenceType.EXPERT,
          source: '재정학 교수 인터뷰',
          date: '2026.08.05',
          summary:
            '납부 유예 같은 보완 장치 없이는 지불 능력 문제가 남는다고 설명했다.',
          url: 'https://example.com/property-tax/public-finance-interview',
        },
        {
          id: 'property-tax-disagree-1-ev-4',
          type: EvidenceType.CLAIM,
          source: '주택 소유자 단체 입장문',
          date: '2026.08.16',
          summary:
            '실거주 1주택에 대해서는 세 부담 완화 기준을 유지해야 한다고 요구했다.',
          url: 'https://example.com/property-tax/homeowner-statement',
        },
      ],
    },
    {
      id: 'property-tax-disagree-2',
      side: ClaimSide.DISAGREE,
      title: '주택 거래가 위축될 수 있다',
      description:
        '보유 부담이 커지면 매물이 늘어난다는 예측과 달리, 거래세까지 함께 높으면 매매 자체가 줄어들 수 있다는 반론이다. 이사와 주거 이동이 어려워져 시장이 굳어질 수 있다는 우려도 제기된다.',
      persuadedCount: 1360,
      evidences: [
        {
          id: 'property-tax-disagree-2-ev-1',
          type: EvidenceType.FACT,
          source: '부동산 통계 자료',
          date: '2026.07.15',
          summary:
            '주택 매매 거래량이 최근 몇 분기 동안 낮은 수준에 머물러 있는 것으로 나타났다.',
          url: 'https://example.com/property-tax/transaction-volume',
        },
        {
          id: 'property-tax-disagree-2-ev-2',
          type: EvidenceType.RESEARCH,
          source: '주택시장 분석 보고서',
          date: '2026.08.01',
          summary:
            '보유세와 거래세를 동시에 높인 사례에서 거래 감소가 관측됐다고 분석했다.',
          url: 'https://example.com/property-tax/market-analysis',
        },
        {
          id: 'property-tax-disagree-2-ev-3',
          type: EvidenceType.EXPERT,
          source: '부동산학 교수 기고',
          date: '2026.08.09',
          summary:
            '보유세 강화는 거래세 인하와 함께 설계돼야 효과를 낸다고 지적했다.',
          url: 'https://example.com/property-tax/real-estate-column',
        },
      ],
    },
    {
      id: 'property-tax-disagree-3',
      side: ClaimSide.DISAGREE,
      title: '세 부담이 임차인에게 전가될 수 있다',
      description:
        '늘어난 보유세가 임대료에 반영되면 결과적으로 세입자가 부담을 지게 된다는 지적이다. 임대차 시장의 공급이 줄어들 경우 전가 폭이 더 커질 수 있다는 우려가 함께 제기된다.',
      persuadedCount: 920,
      evidences: [
        {
          id: 'property-tax-disagree-3-ev-1',
          type: EvidenceType.RESEARCH,
          source: '주거정책 연구기관 보고서',
          date: '2026.07.30',
          summary:
            '보유세 인상분의 일부가 임대료로 이전되는 경향을 지역별로 추정했다.',
          url: 'https://example.com/property-tax/rent-passthrough',
        },
        {
          id: 'property-tax-disagree-3-ev-2',
          type: EvidenceType.EXPERT,
          source: '조세법 교수 인터뷰',
          date: '2026.08.12',
          summary:
            '전가 정도는 임대차 공급 상황에 따라 크게 달라진다고 설명했다.',
          url: 'https://example.com/property-tax/tax-incidence-interview',
        },
      ],
    },
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      articleCount: 16,
      frame: '보유세는 자산 격차와 주거 불평등을 다루는 과제',
      keywords: ['자산 격차', '주거 불평등', '과세 형평성'],
      representativeArticle: {
        title: '보유세 논의, 자산 격차라는 출발점으로 돌아가야',
        source: '진보 성향 매체',
        url: 'https://example.com/property-tax/media-progressive',
      },
    },
    {
      leaning: MediaLeaning.CENTRIST,
      articleCount: 13,
      frame: '보유세와 거래세의 균형과 단계적 조정 방안',
      keywords: ['세제 균형', '단계적 조정', '해외 사례'],
      representativeArticle: {
        title: '보유세 개편, 거래세와의 조합이 관건',
        source: '중도 성향 매체',
        url: 'https://example.com/property-tax/media-centrist',
      },
    },
    {
      leaning: MediaLeaning.CONSERVATIVE,
      articleCount: 15,
      frame: '실거주자 부담과 주택시장 위축 가능성',
      keywords: ['실거주자 부담', '거래 위축', '세 부담 전가'],
      representativeArticle: {
        title: '한 채 보유 가구가 마주한 보유세 부담의 현실',
        source: '보수 성향 매체',
        url: 'https://example.com/property-tax/media-conservative',
      },
    },
  ],
  commonCoverage: [
    '국회와 정부에서 보유세 개편 논의가 다시 시작됐다는 사실',
    '보유세와 거래세를 함께 조정해야 한다는 논의가 이어지고 있다는 점',
    '실거주 1주택 가구에 대한 보완 장치가 쟁점으로 다뤄지고 있다는 점',
  ],
  opinionGroups: [
    {
      id: 'property-tax-group-a',
      label: '그룹 A',
      share: 31,
      description: '자산 격차 완화를 위해 보유세 강화가 필요하다고 보는 사람들',
      agreesWith: ['property-tax-agree-1', 'property-tax-agree-2'],
      disagreesWith: ['property-tax-disagree-2'],
      mostDivided: ['property-tax-disagree-3'],
    },
    {
      id: 'property-tax-group-b',
      label: '그룹 B',
      share: 29,
      description: '강화 취지에는 공감하지만 실거주자 부담을 걱정하는 사람들',
      agreesWith: ['property-tax-agree-3'],
      disagreesWith: ['property-tax-disagree-2'],
      mostDivided: ['property-tax-agree-1', 'property-tax-disagree-1'],
    },
    {
      id: 'property-tax-group-c',
      label: '그룹 C',
      share: 25,
      description: '세 부담 증가보다 시장 자율 조정을 선호하는 사람들',
      agreesWith: ['property-tax-disagree-1', 'property-tax-disagree-2'],
      disagreesWith: ['property-tax-agree-2'],
      mostDivided: ['property-tax-agree-3'],
    },
  ],
};
