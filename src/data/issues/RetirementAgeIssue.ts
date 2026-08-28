import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import type { Issue } from '@/domain/Issue';

export const retirementAgeIssue: Issue = {
  id: 'retirement-65',
  slug: 'retirement-65',
  question: '정년을 65세로 연장해야 할까?',
  tags: ['노동', '복지'],
  participantCount: 6317,
  distribution: { agree: 52, disagree: 29, unsure: 19 },
  summary: [
    '고령화와 연금 수급 개시 연령 조정에 맞춰 정년 연장 논의가 다시 이어지고 있다.',
    '논의의 핵심은 퇴직과 연금 수급 사이의 소득 공백을 어떻게 메우면서 청년 고용을 지킬 것인지다.',
    '찬성 측은 노후 소득 공백 해소와 숙련 인력 활용 효과를 강조한다.',
    '반대 측은 청년 채용 위축과 연공형 임금체계의 부담을 우려한다.',
  ],
  sourceArticleCount: 14,
  mediaOutletCount: 9,
  coveragePeriodLabel: '최근 2주',
  keyPoints: [
    {
      id: 'retirement-kp-1',
      title: '연금 공백',
      question: '퇴직 이후 연금 수급까지의 소득 공백을 어떻게 메울 것인가?',
    },
    {
      id: 'retirement-kp-2',
      title: '청년 고용',
      question: '정년 연장이 청년 채용 규모에 영향을 주는가?',
    },
    {
      id: 'retirement-kp-3',
      title: '임금체계',
      question: '연공형 임금체계를 그대로 두고 정년만 늘릴 수 있는가?',
    },
    {
      id: 'retirement-kp-4',
      title: '고령 인력',
      question: '고령 인력의 숙련과 생산성은 어떻게 평가해야 하는가?',
    },
  ],
  claims: [
    {
      id: 'retirement-agree-1',
      side: ClaimSide.AGREE,
      title: '퇴직과 연금 사이의 소득 공백을 줄일 수 있다',
      description:
        '현재는 퇴직 시점과 연금 수급 개시 연령 사이에 소득이 끊기는 기간이 발생한다. 정년을 연장하면 이 공백 기간이 줄어 노후 빈곤 위험을 낮출 수 있다는 주장이다. 공적 지원을 늘리는 것보다 근로 기간을 늘리는 편이 현실적이라는 시각도 함께 제기된다.',
      persuadedCount: 1980,
      evidences: [
        {
          id: 'retirement-agree-1-ev-1',
          type: EvidenceType.FACT,
          source: '국회 입법조사처',
          date: '2026.07.13',
          summary:
            '법정 정년과 연금 수급 개시 연령 사이에 수년의 간격이 존재한다는 점을 정리한 자료다.',
          url: 'https://example.com/retirement/income-gap-brief',
        },
        {
          id: 'retirement-agree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '연금 관련 연구기관 보고서',
          date: '2026.07.21',
          summary:
            '소득 공백 기간이 길수록 고령층의 자산 소진 속도가 빨라진다는 분석 결과를 담았다.',
          url: 'https://example.com/retirement/pension-gap-report',
        },
        {
          id: 'retirement-agree-1-ev-3',
          type: EvidenceType.EXPERT,
          source: '사회정책학 교수 인터뷰',
          date: '2026.08.03',
          summary:
            '정년 연장은 노후 소득 보장 정책과 함께 설계될 때 효과가 있다고 설명했다.',
          url: 'https://example.com/retirement/policy-expert-interview',
        },
        {
          id: 'retirement-agree-1-ev-4',
          type: EvidenceType.CLAIM,
          source: '노동단체 성명',
          date: '2026.08.10',
          summary:
            '소득 공백 해소를 이유로 정년 연장의 법제화를 요구하는 입장을 밝혔다.',
          url: 'https://example.com/retirement/labor-statement',
        },
      ],
    },
    {
      id: 'retirement-agree-2',
      side: ClaimSide.AGREE,
      title: '숙련 인력을 더 오래 활용할 수 있다',
      description:
        '오랜 기간 축적된 현장 경험과 기술은 단기간에 대체하기 어렵다는 문제 제기다. 정년을 늘리면 숙련 인력의 이탈 속도를 늦추고 기술 전수 기간을 확보할 수 있다는 주장이다.',
      persuadedCount: 1470,
      evidences: [
        {
          id: 'retirement-agree-2-ev-1',
          type: EvidenceType.FACT,
          source: '고용노동 통계 자료',
          date: '2026.07.17',
          summary:
            '숙련 기능 인력이 필요한 업종에서 인력 부족을 호소하는 사업장 비율이 높게 집계됐다.',
          url: 'https://example.com/retirement/skilled-labor-stats',
        },
        {
          id: 'retirement-agree-2-ev-2',
          type: EvidenceType.RESEARCH,
          source: '산업연구기관 보고서',
          date: '2026.07.28',
          summary:
            '고령 숙련 인력의 조기 이탈이 현장 기술 전수의 단절로 이어졌다는 사례를 분석했다.',
          url: 'https://example.com/retirement/skill-transfer-report',
        },
        {
          id: 'retirement-agree-2-ev-3',
          type: EvidenceType.EXPERT,
          source: '인적자원관리 전문가 기고',
          date: '2026.08.05',
          summary:
            '고령 인력 활용은 직무 재배치와 함께 이뤄져야 효과가 난다고 지적했다.',
          url: 'https://example.com/retirement/hr-column',
        },
      ],
    },
    {
      id: 'retirement-agree-3',
      side: ClaimSide.AGREE,
      title: '생산가능인구 감소에 대응할 수 있다',
      description:
        '인구 구조 변화로 일할 사람 자체가 줄어들고 있다는 점을 근거로 든다. 정년 연장이 노동 공급을 유지하고 사회보험 재정 기반을 넓히는 수단이 될 수 있다는 기대다.',
      persuadedCount: 1020,
      evidences: [
        {
          id: 'retirement-agree-3-ev-1',
          type: EvidenceType.FACT,
          source: '인구 통계 자료',
          date: '2026.07.24',
          summary:
            '생산가능인구가 앞으로 수십 년간 지속적으로 감소할 것으로 전망됐다.',
          url: 'https://example.com/retirement/population-outlook',
        },
        {
          id: 'retirement-agree-3-ev-2',
          type: EvidenceType.RESEARCH,
          source: '연금 관련 연구기관 보고서',
          date: '2026.08.07',
          summary:
            '고령층 경제활동 참가율이 오르면 사회보험 가입자 기반이 넓어진다고 추정했다.',
          url: 'https://example.com/retirement/insurance-base-estimate',
        },
      ],
    },
    {
      id: 'retirement-disagree-1',
      side: ClaimSide.DISAGREE,
      title: '청년 채용이 줄어들 수 있다',
      description:
        '기업의 인건비 총액이 정해져 있는 상황에서 상위 연령대의 고용이 늘면 신규 채용 여력이 줄어든다는 우려다. 특히 채용 규모가 제한된 조직일수록 세대 간 자리 경쟁이 커질 수 있다는 지적이 나온다.',
      persuadedCount: 1810,
      evidences: [
        {
          id: 'retirement-disagree-1-ev-1',
          type: EvidenceType.FACT,
          source: '고용노동 통계 자료',
          date: '2026.07.15',
          summary:
            '청년층 고용률이 최근 몇 년간 정체 상태를 보이고 있다는 집계를 담았다.',
          url: 'https://example.com/retirement/youth-employment-stats',
        },
        {
          id: 'retirement-disagree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '노동시장 연구기관 보고서',
          date: '2026.07.26',
          summary:
            '과거 정년 연장 시기에 일부 대규모 사업장의 신규 채용이 줄었다는 분석을 제시했다.',
          url: 'https://example.com/retirement/hiring-impact-report',
        },
        {
          id: 'retirement-disagree-1-ev-3',
          type: EvidenceType.CLAIM,
          source: '경제단체 성명',
          date: '2026.08.04',
          summary:
            '일률적인 정년 연장보다 재고용 방식의 선택지를 넓혀야 한다는 입장을 발표했다.',
          url: 'https://example.com/retirement/business-statement',
        },
        {
          id: 'retirement-disagree-1-ev-4',
          type: EvidenceType.EXPERT,
          source: '노동경제학 교수 인터뷰',
          date: '2026.08.12',
          summary:
            '세대 간 대체 효과는 업종과 기업 규모에 따라 다르게 나타난다고 설명했다.',
          url: 'https://example.com/retirement/economist-interview',
        },
      ],
    },
    {
      id: 'retirement-disagree-2',
      side: ClaimSide.DISAGREE,
      title: '연공형 임금체계에서는 비용 부담이 크다',
      description:
        '근속 기간에 따라 임금이 오르는 구조에서는 정년을 늘릴수록 인건비가 빠르게 증가한다. 임금체계 개편 없이 정년만 연장하면 기업이 감당하기 어렵다는 지적이다.',
      persuadedCount: 1330,
      evidences: [
        {
          id: 'retirement-disagree-2-ev-1',
          type: EvidenceType.FACT,
          source: '임금구조 실태조사 자료',
          date: '2026.07.19',
          summary:
            '근속 연수에 따른 임금 격차가 주요국과 비교해 큰 편으로 나타났다.',
          url: 'https://example.com/retirement/wage-structure-survey',
        },
        {
          id: 'retirement-disagree-2-ev-2',
          type: EvidenceType.RESEARCH,
          source: '경제연구기관 보고서',
          date: '2026.08.01',
          summary:
            '정년을 연장했을 때의 인건비 증가폭을 기업 규모별로 추정한 결과를 정리했다.',
          url: 'https://example.com/retirement/labor-cost-estimate',
        },
        {
          id: 'retirement-disagree-2-ev-3',
          type: EvidenceType.EXPERT,
          source: '노사관계 전문가 기고',
          date: '2026.08.09',
          summary:
            '임금체계 개편 논의가 선행되지 않으면 노사 갈등이 커질 수 있다고 지적했다.',
          url: 'https://example.com/retirement/labor-relations-column',
        },
      ],
    },
    {
      id: 'retirement-disagree-3',
      side: ClaimSide.DISAGREE,
      title: '혜택이 일부 사업장에 쏠릴 수 있다',
      description:
        '정년 규정이 실제로 지켜지는 곳은 고용이 안정된 대규모 사업장에 가깝다는 반론이다. 이미 정년 이전에 이직이 잦은 중소 사업장이나 비정규 노동자에게는 효과가 제한적일 수 있다는 우려가 있다.',
      persuadedCount: 940,
      evidences: [
        {
          id: 'retirement-disagree-3-ev-1',
          type: EvidenceType.FACT,
          source: '고용노동 통계 자료',
          date: '2026.07.30',
          summary:
            '평균 실제 퇴직 연령이 법정 정년보다 낮은 수준으로 집계됐다.',
          url: 'https://example.com/retirement/actual-retirement-age',
        },
        {
          id: 'retirement-disagree-3-ev-2',
          type: EvidenceType.CLAIM,
          source: '중소기업 단체 입장문',
          date: '2026.08.14',
          summary:
            '현장에서는 정년 규정보다 인력 유지 자체가 더 큰 과제라는 입장을 밝혔다.',
          url: 'https://example.com/retirement/sme-statement',
        },
      ],
    },
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      articleCount: 16,
      frame: '정년 연장은 노후 소득 보장과 고령 노동자의 권리 문제',
      keywords: ['노후 소득 공백', '고령 노동자 권리', '연금 연계'],
      representativeArticle: {
        title: '퇴직 이후의 빈 시간, 소득 공백부터 논의해야',
        source: '진보 성향 매체',
        url: 'https://example.com/retirement/media-progressive',
      },
    },
    {
      leaning: MediaLeaning.CENTRIST,
      articleCount: 13,
      frame: '임금체계 개편과 단계적 적용을 포함한 제도 설계',
      keywords: ['임금체계 개편', '단계적 적용', '해외 사례'],
      representativeArticle: {
        title: '정년 65세, 임금체계 논의와 함께 가야 하는 이유',
        source: '중도 성향 매체',
        url: 'https://example.com/retirement/media-centrist',
      },
    },
    {
      leaning: MediaLeaning.CONSERVATIVE,
      articleCount: 15,
      frame: '기업 인건비 부담과 청년 채용에 미칠 영향',
      keywords: ['인건비 부담', '청년 채용', '재고용 방식'],
      representativeArticle: {
        title: '채용 규모는 그대로인데 정년만 늘린다면',
        source: '보수 성향 매체',
        url: 'https://example.com/retirement/media-conservative',
      },
    },
  ],
  commonCoverage: [
    '고령화와 연금 수급 개시 연령 조정으로 정년 연장 논의가 다시 부상했다는 사실',
    '퇴직 이후 연금 수급까지의 소득 공백이 핵심 쟁점이라는 점',
    '임금체계 개편과 재고용 방식이 대안으로 함께 논의되고 있다는 점',
  ],
  opinionGroups: [
    {
      id: 'retirement-group-a',
      label: '그룹 A',
      share: 34,
      description: '노후 소득 보장을 우선해 정년 연장에 찬성하는 사람들',
      agreesWith: ['retirement-agree-1', 'retirement-agree-3'],
      disagreesWith: ['retirement-disagree-2'],
      mostDivided: ['retirement-disagree-1'],
    },
    {
      id: 'retirement-group-b',
      label: '그룹 B',
      share: 28,
      description: '취지에는 공감하지만 청년 고용 영향을 걱정하는 사람들',
      agreesWith: ['retirement-agree-1'],
      disagreesWith: ['retirement-agree-3'],
      mostDivided: ['retirement-disagree-1', 'retirement-disagree-3'],
    },
    {
      id: 'retirement-group-c',
      label: '그룹 C',
      share: 23,
      description: '법정 연장보다 기업 자율의 재고용 방식을 선호하는 사람들',
      agreesWith: ['retirement-disagree-1', 'retirement-disagree-2'],
      disagreesWith: ['retirement-agree-2'],
      mostDivided: ['retirement-agree-1'],
    },
  ],
};
