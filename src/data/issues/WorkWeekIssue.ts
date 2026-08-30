import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import type { Issue } from '@/domain/Issue';

export const workWeekIssue: Issue = {
  id: 'work-week-4-5',
  slug: 'work-week-4-5',
  question: '주 4.5일제를 도입해야 할까?',
  tags: ['노동', '경제'],
  participantCount: 12481,
  distribution: { agree: 57, disagree: 31, unsure: 12 },
  summary: [
    '정부와 정치권에서 주 4.5일제 도입 논의가 확대되고 있다.',
    '논의의 핵심은 노동시간을 줄이면서 임금과 생산성을 어떻게 유지할 것인지다.',
    '찬성 측은 삶의 질과 생산성 향상 가능성을 주장하고 있다.',
    '반대 측은 기업 비용과 업종별 적용의 어려움을 우려한다.',
  ],
  sourceArticleCount: 12,
  mediaOutletCount: 12,
  coveragePeriodLabel: '최근 2주',
  keyPoints: [
    {
      id: 'work-week-kp-1',
      title: '노동시간',
      question: '근로시간이 실제로 얼마나 줄어드는가?',
    },
    {
      id: 'work-week-kp-2',
      title: '임금',
      question: '근로시간 감소 시 임금은 어떻게 되는가?',
    },
    {
      id: 'work-week-kp-3',
      title: '기업 비용',
      question: '기업의 인건비와 생산성에는 어떤 영향을 주는가?',
    },
    {
      id: 'work-week-kp-4',
      title: '생산성',
      question: '근로시간 단축이 생산성 향상으로 이어질 수 있는가?',
    },
  ],
  claims: [
    {
      id: 'work-week-agree-1',
      side: ClaimSide.AGREE,
      title: '삶의 질이 높아질 수 있다',
      description:
        '주말이 하루 반으로 늘어나면 가족과 보내는 시간, 휴식과 자기계발에 쓸 시간이 늘어난다. 장시간 노동에서 오는 피로와 건강 부담을 줄일 수 있다는 기대도 함께 제기된다.',
      persuadedCount: 2391,
      evidences: [
        {
          id: 'work-week-agree-1-ev-1',
          type: EvidenceType.FACT,
          source: '국회 입법조사처',
          date: '2026.07.14',
          summary:
            '국내 연간 노동시간이 주요국 평균보다 여전히 높은 수준이라는 통계를 정리한 자료다.',
          url: 'https://example.com/work-week/labor-hours-brief',
        },
        {
          id: 'work-week-agree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '노동연구원 보고서',
          date: '2026.07.22',
          summary:
            '주 4.5일제 시범 사업 참여 사업장에서 근로자의 수면 시간과 여가 시간이 늘어난 것으로 조사됐다.',
          url: 'https://example.com/work-week/pilot-survey',
        },
        {
          id: 'work-week-agree-1-ev-3',
          type: EvidenceType.EXPERT,
          source: '노동경제학 교수 인터뷰',
          date: '2026.08.02',
          summary:
            '노동시간 단축은 임금 수준이 유지될 때에만 삶의 질 개선으로 이어진다고 설명했다.',
          url: 'https://example.com/work-week/expert-interview',
        },
        {
          id: 'work-week-agree-1-ev-4',
          type: EvidenceType.CLAIM,
          source: '노동단체 성명',
          date: '2026.08.08',
          summary:
            '노동시간 단축을 건강권 문제로 규정하고 법제화를 요구하는 입장을 밝혔다.',
          url: 'https://example.com/work-week/union-statement',
        },
      ],
    },
    {
      id: 'work-week-agree-2',
      side: ClaimSide.AGREE,
      title: '장시간 노동을 줄이면 생산성이 높아질 수 있다',
      description:
        '오래 일하는 것과 많이 해내는 것은 다르다는 문제 제기다. 집중 근무 시간이 늘고 불필요한 업무가 정리되면 시간당 성과가 개선될 수 있다는 주장이다.',
      persuadedCount: 1874,
      evidences: [
        {
          id: 'work-week-agree-2-ev-1',
          type: EvidenceType.RESEARCH,
          source: '노동연구원 보고서',
          date: '2026.07.18',
          summary:
            '근로시간을 줄인 사업장에서 시간당 산출이 소폭 상승했다는 분석 결과를 담았다.',
          url: 'https://example.com/work-week/productivity-analysis',
        },
        {
          id: 'work-week-agree-2-ev-2',
          type: EvidenceType.FACT,
          source: '국제기구 통계 자료',
          date: '2026.07.29',
          summary:
            '연간 노동시간이 짧은 국가들이 시간당 노동생산성 지표에서 상위권을 차지하고 있다.',
          url: 'https://example.com/work-week/oecd-productivity',
        },
        {
          id: 'work-week-agree-2-ev-3',
          type: EvidenceType.EXPERT,
          source: '경영학 교수 기고',
          date: '2026.08.05',
          summary:
            '노동시간 단축이 생산성으로 이어지려면 업무 재설계가 함께 이뤄져야 한다고 지적했다.',
          url: 'https://example.com/work-week/management-column',
        },
      ],
    },
    {
      id: 'work-week-agree-3',
      side: ClaimSide.AGREE,
      title: '여가와 소비가 늘어날 수 있다',
      description:
        '쉬는 시간이 늘면 여행, 문화, 지역 상권 소비가 함께 늘어날 수 있다는 기대가 있다. 내수 진작 효과를 근거로 제도 도입을 지지하는 목소리다.',
      persuadedCount: 1105,
      evidences: [
        {
          id: 'work-week-agree-3-ev-1',
          type: EvidenceType.RESEARCH,
          source: '지역경제연구기관 보고서',
          date: '2026.07.25',
          summary:
            '휴일이 하루 늘어날 경우 여가·숙박 지출이 증가하는 경향을 추정한 자료다.',
          url: 'https://example.com/work-week/consumption-estimate',
        },
        {
          id: 'work-week-agree-3-ev-2',
          type: EvidenceType.CLAIM,
          source: '관광업계 협회 입장문',
          date: '2026.08.11',
          summary:
            '주말 이용객 분산과 비수기 수요 확대를 이유로 제도 도입에 찬성한다고 밝혔다.',
          url: 'https://example.com/work-week/tourism-statement',
        },
      ],
    },
    {
      id: 'work-week-disagree-1',
      side: ClaimSide.DISAGREE,
      title: '기업의 비용 부담이 증가할 수 있다',
      description:
        '임금을 유지하면서 노동시간을 줄이면 인건비가 사실상 인상되는 효과가 있다. 인력을 추가로 뽑기 어려운 기업일수록 부담이 크다는 지적이다.',
      persuadedCount: 1952,
      evidences: [
        {
          id: 'work-week-disagree-1-ev-1',
          type: EvidenceType.FACT,
          source: '중소기업 실태조사 자료',
          date: '2026.07.16',
          summary:
            '인력난을 겪고 있는 중소 사업장의 비율이 높은 수준으로 집계됐다.',
          url: 'https://example.com/work-week/sme-survey',
        },
        {
          id: 'work-week-disagree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '경제연구기관 보고서',
          date: '2026.07.30',
          summary:
            '임금 보전을 전제한 노동시간 단축의 인건비 증가폭을 업종별로 추정했다.',
          url: 'https://example.com/work-week/cost-estimate',
        },
        {
          id: 'work-week-disagree-1-ev-3',
          type: EvidenceType.CLAIM,
          source: '경제단체 성명',
          date: '2026.08.06',
          summary:
            '일률적인 법제화보다 기업 자율에 맡겨야 한다는 입장을 공식 발표했다.',
          url: 'https://example.com/work-week/business-statement',
        },
        {
          id: 'work-week-disagree-1-ev-4',
          type: EvidenceType.EXPERT,
          source: '재정학 교수 인터뷰',
          date: '2026.08.13',
          summary:
            '지원금으로 비용을 메우는 방식은 지속 가능성이 낮다고 평가했다.',
          url: 'https://example.com/work-week/fiscal-interview',
        },
      ],
    },
    {
      id: 'work-week-disagree-2',
      side: ClaimSide.DISAGREE,
      title: '업종에 따라 적용하기 어렵다',
      description:
        '교대 근무가 필수인 제조·의료·돌봄 현장에서는 근무일을 줄이면 인력 공백이 바로 발생한다. 사무직 중심으로 설계된 제도라는 비판이 나온다.',
      persuadedCount: 1420,
      evidences: [
        {
          id: 'work-week-disagree-2-ev-1',
          type: EvidenceType.FACT,
          source: '보건의료 인력 통계',
          date: '2026.07.20',
          summary:
            '교대제 사업장의 결원 발생 시 대체 인력 확보에 걸리는 기간이 길게 나타났다.',
          url: 'https://example.com/work-week/shift-workforce',
        },
        {
          id: 'work-week-disagree-2-ev-2',
          type: EvidenceType.RESEARCH,
          source: '산업연구기관 보고서',
          date: '2026.08.01',
          summary:
            '연속 공정이 필요한 제조업에서 근무일 축소의 적용 난도가 높다고 분석했다.',
          url: 'https://example.com/work-week/manufacturing-report',
        },
        {
          id: 'work-week-disagree-2-ev-3',
          type: EvidenceType.EXPERT,
          source: '인사노무 전문가 기고',
          date: '2026.08.09',
          summary:
            '업종별 차등 적용 없이는 현장 혼선이 커질 수 있다고 지적했다.',
          url: 'https://example.com/work-week/hr-column',
        },
      ],
    },
    {
      id: 'work-week-disagree-3',
      side: ClaimSide.DISAGREE,
      title: '실질적인 생산성 향상이 보장되지 않는다',
      description:
        '노동시간을 줄이면 생산성이 오른다는 근거가 아직 충분하지 않다는 반론이다. 업무량이 그대로면 남은 날에 부담이 몰릴 수 있다는 우려도 있다.',
      persuadedCount: 988,
      evidences: [
        {
          id: 'work-week-disagree-3-ev-1',
          type: EvidenceType.RESEARCH,
          source: '해외 시범사업 평가 보고서',
          date: '2026.07.27',
          summary:
            '근무일 축소 실험에서 업종에 따라 성과 변화가 엇갈렸다는 결과를 정리했다.',
          url: 'https://example.com/work-week/trial-evaluation',
        },
        {
          id: 'work-week-disagree-3-ev-2',
          type: EvidenceType.EXPERT,
          source: '노동경제학 교수 인터뷰',
          date: '2026.08.12',
          summary:
            '생산성 효과를 단정하기에는 관측 기간이 짧다고 설명했다.',
          url: 'https://example.com/work-week/economist-caution',
        },
      ],
    },
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      articleCount: 17,
      frame: '노동시간 단축은 삶의 질과 노동자 건강 문제',
      keywords: ['노동자의 삶의 질', '노동시간 단축', '생산성 변화 가능성'],
      representativeArticle: {
        title: '노동시간 단축 논의, 건강권에서 다시 출발해야',
        source: '진보 성향 매체',
        url: 'https://example.com/work-week/media-progressive',
      },
    },
    {
      leaning: MediaLeaning.CENTRIST,
      articleCount: 14,
      frame: '임금·생산성 유지 방안과 단계적 도입 로드맵',
      keywords: ['임금 보전', '단계적 도입', '해외 사례'],
      representativeArticle: {
        title: '주 4.5일제, 임금 보전 설계가 관건',
        source: '중도 성향 매체',
        url: 'https://example.com/work-week/media-centrist',
      },
    },
    {
      leaning: MediaLeaning.CONSERVATIVE,
      articleCount: 17,
      frame: '기업 경쟁력과 중소기업 현실 적용 가능성',
      keywords: ['기업 비용', '중소기업 부담', '제도 적용 가능성'],
      representativeArticle: {
        title: '중소기업 현장에서 본 근무일 축소의 조건',
        source: '보수 성향 매체',
        url: 'https://example.com/work-week/media-conservative',
      },
    },
  ],
  commonCoverage: [
    '정부와 정치권에서 주 4.5일제 도입 논의가 본격화됐다는 사실',
    '노동시간을 줄이면서 임금을 어떻게 보전할지가 핵심 쟁점이라는 점',
    '업종과 기업 규모에 따라 차등 적용이 필요하다는 논의가 있다는 점',
  ],
  opinionGroups: [
    {
      id: 'work-week-group-a',
      label: '그룹 A',
      share: 32,
      description: '노동시간 단축에는 찬성하지만 기업 규제에는 신중한 사람들',
      agreesWith: ['work-week-agree-1', 'work-week-agree-2'],
      disagreesWith: ['work-week-disagree-1'],
      mostDivided: ['work-week-disagree-2'],
    },
    {
      id: 'work-week-group-b',
      label: '그룹 B',
      share: 27,
      description: '제도 취지에는 찬성하지만 중소기업 부담을 걱정하는 사람들',
      agreesWith: ['work-week-agree-1'],
      disagreesWith: ['work-week-disagree-3'],
      mostDivided: ['work-week-disagree-1', 'work-week-disagree-2'],
    },
    {
      id: 'work-week-group-c',
      label: '그룹 C',
      share: 24,
      description: '정부 정책보다 기업 자율 결정을 선호하는 사람들',
      agreesWith: ['work-week-disagree-1', 'work-week-disagree-2'],
      disagreesWith: ['work-week-agree-3'],
      mostDivided: ['work-week-agree-2'],
    },
  ],
};
