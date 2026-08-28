import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import type { Issue } from '@/domain/Issue';

export const nuclearIssue: Issue = {
  id: 'nuclear-expansion',
  question: '원전 비중을 확대해야 할까?',
  tags: ['에너지', '환경'],
  participantCount: 8902,
  distribution: { agree: 44, disagree: 41, unsure: 15 },
  summary: [
    '신규 원전 건설과 기존 원전 수명 연장을 두고 논의가 이어지고 있다.',
    '핵심 쟁점은 전력 수요 증가에 대응하면서 안전과 폐기물 문제를 어떻게 감당할 것인지다.',
    '찬성 측은 안정적인 전력 공급과 낮은 발전 단가를 근거로 든다.',
    '반대 측은 사고 위험과 고준위 폐기물 처분 대책의 부재를 지적한다.',
  ],
  sourceArticleCount: 14,
  mediaOutletCount: 11,
  coveragePeriodLabel: '최근 한 달',
  keyPoints: [
    {
      id: 'nuclear-kp-1',
      title: '전력 수요',
      question: '앞으로 늘어날 전력 수요를 무엇으로 감당할 것인가?',
    },
    {
      id: 'nuclear-kp-2',
      title: '안전성',
      question: '사고 위험은 어느 수준까지 관리할 수 있는가?',
    },
    {
      id: 'nuclear-kp-3',
      title: '폐기물',
      question: '고준위 방사성 폐기물은 어디에 어떻게 보관할 것인가?',
    },
    {
      id: 'nuclear-kp-4',
      title: '재생에너지',
      question: '재생에너지 확대만으로 전력 수급을 맞출 수 있는가?',
    },
  ],
  claims: [
    {
      id: 'nuclear-agree-1',
      side: ClaimSide.AGREE,
      title: '늘어나는 전력 수요를 안정적으로 감당할 수 있다',
      description:
        '데이터센터와 전기화 확대로 전력 수요가 빠르게 늘어나는 상황에서 날씨와 무관하게 가동되는 발전원이 필요하다는 주장이다. 원전은 연중 고른 출력을 유지할 수 있어 기저 부하를 담당하기에 적합하다는 설명이 뒤따른다.',
      persuadedCount: 2100,
      evidences: [
        {
          id: 'nuclear-agree-1-ev-1',
          type: EvidenceType.FACT,
          source: '전력수급 통계 자료',
          date: '2026.07.09',
          summary:
            '최근 몇 년간 여름철 최대 전력 수요가 매년 갱신되고 있다는 집계를 담았다.',
          url: 'https://example.com/nuclear/peak-demand-stats',
        },
        {
          id: 'nuclear-agree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '에너지경제연구기관 보고서',
          date: '2026.07.21',
          summary:
            '데이터센터 증설을 반영한 장기 수요 전망에서 기저 발전 설비 확충이 필요하다고 분석했다.',
          url: 'https://example.com/nuclear/long-term-demand',
        },
        {
          id: 'nuclear-agree-1-ev-3',
          type: EvidenceType.EXPERT,
          source: '에너지공학 교수 인터뷰',
          date: '2026.08.03',
          summary:
            '변동성이 큰 발전원만으로는 계통 안정성을 유지하기 어렵다고 설명했다.',
          url: 'https://example.com/nuclear/grid-stability-interview',
        },
        {
          id: 'nuclear-agree-1-ev-4',
          type: EvidenceType.CLAIM,
          source: '산업계 협회 입장문',
          date: '2026.08.10',
          summary:
            '제조업 경쟁력 유지를 위해 안정적인 전력 공급 대책이 시급하다고 밝혔다.',
          url: 'https://example.com/nuclear/industry-statement',
        },
      ],
    },
    {
      id: 'nuclear-agree-2',
      side: ClaimSide.AGREE,
      title: '발전 과정에서 온실가스 배출이 적다',
      description:
        '탄소 감축 목표를 지키려면 화력 발전을 대체할 수단이 필요하다는 문제 인식이다. 원전은 발전 단계에서 온실가스를 거의 배출하지 않아 감축 수단으로 활용할 수 있다는 주장이다.',
      persuadedCount: 1680,
      evidences: [
        {
          id: 'nuclear-agree-2-ev-1',
          type: EvidenceType.RESEARCH,
          source: '기후정책연구기관 보고서',
          date: '2026.07.15',
          summary:
            '발전원별 생애주기 온실가스 배출량 비교에서 원전이 낮은 구간에 위치한다고 정리했다.',
          url: 'https://example.com/nuclear/lifecycle-emissions',
        },
        {
          id: 'nuclear-agree-2-ev-2',
          type: EvidenceType.FACT,
          source: '국제기구 에너지 통계',
          date: '2026.07.28',
          summary:
            '원전 비중이 높은 국가의 전력 부문 탄소 집약도가 상대적으로 낮게 나타났다.',
          url: 'https://example.com/nuclear/carbon-intensity',
        },
        {
          id: 'nuclear-agree-2-ev-3',
          type: EvidenceType.EXPERT,
          source: '기후경제학 교수 기고',
          date: '2026.08.07',
          summary:
            '감축 목표 달성 시점을 고려하면 선택지를 좁히지 않는 편이 유리하다고 밝혔다.',
          url: 'https://example.com/nuclear/climate-column',
        },
      ],
    },
    {
      id: 'nuclear-agree-3',
      side: ClaimSide.AGREE,
      title: '장기적으로 전력 요금 부담을 낮출 수 있다',
      description:
        '초기 건설비는 크지만 운영 기간이 길어 단위당 발전 단가가 낮아진다는 계산이다. 연료비 비중이 작아 국제 에너지 가격 변동의 영향을 덜 받는다는 점도 근거로 제시된다.',
      persuadedCount: 1240,
      evidences: [
        {
          id: 'nuclear-agree-3-ev-1',
          type: EvidenceType.RESEARCH,
          source: '에너지경제연구기관 보고서',
          date: '2026.07.24',
          summary:
            '발전원별 균등화 발전 원가를 비교하며 장기 운전 시 단가가 하락하는 구조를 분석했다.',
          url: 'https://example.com/nuclear/levelized-cost',
        },
        {
          id: 'nuclear-agree-3-ev-2',
          type: EvidenceType.FACT,
          source: '전력거래 통계 자료',
          date: '2026.08.05',
          summary:
            '연료비 변동이 컸던 기간에도 원전의 정산 단가 변동폭은 작게 나타났다.',
          url: 'https://example.com/nuclear/settlement-price',
        },
      ],
    },
    {
      id: 'nuclear-disagree-1',
      side: ClaimSide.DISAGREE,
      title: '사고가 발생하면 피해 범위를 되돌리기 어렵다',
      description:
        '발생 확률이 낮더라도 사고가 일어났을 때의 피해가 지역 단위로 장기간 이어진다는 우려다. 인구 밀집 지역과 가까운 입지 조건에서는 대피와 복구 계획의 실효성을 따져야 한다는 지적이 나온다.',
      persuadedCount: 2040,
      evidences: [
        {
          id: 'nuclear-disagree-1-ev-1',
          type: EvidenceType.FACT,
          source: '원자력안전위원회 자료',
          date: '2026.07.11',
          summary:
            '원전 주변 방사선 비상계획구역 내 거주 인구 규모를 지역별로 집계했다.',
          url: 'https://example.com/nuclear/emergency-zone-population',
        },
        {
          id: 'nuclear-disagree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '재난안전연구기관 보고서',
          date: '2026.07.26',
          summary:
            '대규모 사고를 가정한 대피 시뮬레이션에서 소요 시간이 계획치를 넘어섰다고 분석했다.',
          url: 'https://example.com/nuclear/evacuation-simulation',
        },
        {
          id: 'nuclear-disagree-1-ev-3',
          type: EvidenceType.EXPERT,
          source: '방사선방호 전문가 인터뷰',
          date: '2026.08.04',
          summary:
            '설비 노후화가 진행될수록 점검 주기와 기준을 더 엄격히 적용해야 한다고 설명했다.',
          url: 'https://example.com/nuclear/radiation-expert',
        },
        {
          id: 'nuclear-disagree-1-ev-4',
          type: EvidenceType.CLAIM,
          source: '환경단체 성명',
          date: '2026.08.14',
          summary:
            '수명이 다한 원전의 계속 운전 심사를 중단할 것을 요구하는 입장을 밝혔다.',
          url: 'https://example.com/nuclear/environment-statement',
        },
      ],
    },
    {
      id: 'nuclear-disagree-2',
      side: ClaimSide.DISAGREE,
      title: '고준위 폐기물 처분 대책이 마련되지 않았다',
      description:
        '사용후핵연료를 영구 보관할 처분장이 아직 확보되지 않은 상태라는 지적이다. 임시 저장 시설이 포화에 가까워지는 상황에서 발전량을 늘리면 부담이 다음 세대로 넘어간다는 우려가 제기된다.',
      persuadedCount: 1510,
      evidences: [
        {
          id: 'nuclear-disagree-2-ev-1',
          type: EvidenceType.FACT,
          source: '방사성폐기물 관리 통계',
          date: '2026.07.18',
          summary:
            '원전별 사용후핵연료 임시 저장 시설의 포화 예상 시점을 정리한 자료다.',
          url: 'https://example.com/nuclear/spent-fuel-capacity',
        },
        {
          id: 'nuclear-disagree-2-ev-2',
          type: EvidenceType.RESEARCH,
          source: '국회 입법조사처',
          date: '2026.08.01',
          summary:
            '해외 처분장 확보 사례에서 부지 선정에만 수십 년이 걸린 과정을 비교 분석했다.',
          url: 'https://example.com/nuclear/repository-cases',
        },
        {
          id: 'nuclear-disagree-2-ev-3',
          type: EvidenceType.CLAIM,
          source: '원전 인근 지역 주민 협의체 입장문',
          date: '2026.08.12',
          summary:
            '처분장 부지 선정 절차에 지역 동의 요건을 강화할 것을 요구했다.',
          url: 'https://example.com/nuclear/local-residents-statement',
        },
      ],
    },
    {
      id: 'nuclear-disagree-3',
      side: ClaimSide.DISAGREE,
      title: '재생에너지 확대에 쓸 재원이 줄어든다',
      description:
        '한정된 투자 재원과 계통 용량을 원전에 배분하면 태양광과 풍력 확대 속도가 느려진다는 주장이다. 건설 기간이 긴 원전보다 단기간에 설비를 늘릴 수 있는 쪽에 집중해야 한다는 의견이다.',
      persuadedCount: 1090,
      evidences: [
        {
          id: 'nuclear-disagree-3-ev-1',
          type: EvidenceType.RESEARCH,
          source: '전력계통 연구기관 보고서',
          date: '2026.07.30',
          summary:
            '신규 원전의 계획부터 상업 운전까지 걸린 기간이 당초 일정을 넘어선 사례를 정리했다.',
          url: 'https://example.com/nuclear/construction-timeline',
        },
        {
          id: 'nuclear-disagree-3-ev-2',
          type: EvidenceType.EXPERT,
          source: '재생에너지 정책 연구자 기고',
          date: '2026.08.09',
          summary:
            '송전망 투자 순서에 따라 재생에너지 접속 대기 물량이 달라진다고 지적했다.',
          url: 'https://example.com/nuclear/grid-investment-column',
        },
      ],
    },
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      articleCount: 15,
      frame: '원전 확대는 안전과 폐기물 책임의 문제',
      keywords: ['사고 위험', '고준위 폐기물', '재생에너지 전환'],
      representativeArticle: {
        title: '처분장 없는 확대, 부담은 누가 지나',
        source: '진보 성향 매체',
        url: 'https://example.com/nuclear/media-progressive',
      },
    },
    {
      leaning: MediaLeaning.CENTRIST,
      articleCount: 13,
      frame: '수요 전망과 발전원 구성의 균형점 찾기',
      keywords: ['전력 수급 계획', '발전 단가', '해외 정책 사례'],
      representativeArticle: {
        title: '원전과 재생에너지, 비율을 정하는 기준은',
        source: '중도 성향 매체',
        url: 'https://example.com/nuclear/media-centrist',
      },
    },
    {
      leaning: MediaLeaning.CONSERVATIVE,
      articleCount: 18,
      frame: '전력 공급 안정성과 산업 경쟁력 확보',
      keywords: ['전력 수요 증가', '전기 요금', '산업 경쟁력'],
      representativeArticle: {
        title: '늘어나는 전력 수요, 공급 대책이 먼저다',
        source: '보수 성향 매체',
        url: 'https://example.com/nuclear/media-conservative',
      },
    },
  ],
  commonCoverage: [
    '데이터센터 증설 등으로 전력 수요 전망치가 상향됐다는 사실',
    '고준위 방사성 폐기물 처분장 부지가 아직 확정되지 않았다는 점',
    '기존 원전의 계속 운전 심사가 진행 중이라는 점',
  ],
  opinionGroups: [
    {
      id: 'nuclear-group-a',
      label: '그룹 A',
      share: 35,
      description: '전력 공급 안정을 최우선으로 보는 사람들',
      agreesWith: ['nuclear-agree-1', 'nuclear-agree-3'],
      disagreesWith: ['nuclear-disagree-3'],
      mostDivided: ['nuclear-disagree-2'],
    },
    {
      id: 'nuclear-group-b',
      label: '그룹 B',
      share: 29,
      description:
        '탄소 감축에는 동의하지만 폐기물 대책을 먼저 요구하는 사람들',
      agreesWith: ['nuclear-agree-2'],
      disagreesWith: ['nuclear-disagree-3'],
      mostDivided: ['nuclear-agree-1', 'nuclear-disagree-2'],
    },
    {
      id: 'nuclear-group-c',
      label: '그룹 C',
      share: 22,
      description: '안전과 환경 위험을 가장 크게 고려하는 사람들',
      agreesWith: ['nuclear-disagree-1', 'nuclear-disagree-2'],
      disagreesWith: ['nuclear-agree-3'],
      mostDivided: ['nuclear-agree-2'],
    },
  ],
};
