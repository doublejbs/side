import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import type { Issue } from '@/domain/Issue';

export const aiRegulationIssue: Issue = {
  id: 'ai-regulation',
  question: 'AI 규제를 강화해야 할까?',
  tags: ['기술', '산업'],
  participantCount: 5140,
  distribution: { agree: 38, disagree: 49, unsure: 13 },
  summary: [
    '국회와 정부에서 인공지능 관련 법제 정비 논의가 이어지고 있다.',
    '논의의 핵심은 이용자 보호를 위한 규제와 산업 성장을 어느 선에서 조율할 것인지다.',
    '규제 강화 측은 안전성 검증과 피해 구제 장치가 먼저 마련돼야 한다고 주장한다.',
    '규제 신중 측은 기술 변화 속도와 국내 산업의 경쟁 여건을 우려한다.',
  ],
  sourceArticleCount: 14,
  mediaOutletCount: 10,
  coveragePeriodLabel: '최근 2주',
  keyPoints: [
    {
      id: 'ai-kp-1',
      title: '안전성',
      question: '인공지능 모델의 위험을 사전에 어떻게 확인하는가?',
    },
    {
      id: 'ai-kp-2',
      title: '산업 경쟁력',
      question: '규제가 국내 기술 개발 속도에 어떤 영향을 주는가?',
    },
    {
      id: 'ai-kp-3',
      title: '일자리',
      question: '자동화가 확산되면 고용 구조는 어떻게 바뀌는가?',
    },
    {
      id: 'ai-kp-4',
      title: '저작권',
      question: '학습에 쓰인 저작물의 권리는 어떻게 보장하는가?',
    },
  ],
  claims: [
    {
      id: 'ai-agree-1',
      side: ClaimSide.AGREE,
      title: '사전 안전성 검증 절차가 필요하다',
      description:
        '영향력이 큰 인공지능 서비스일수록 배포 전에 위험을 점검할 공식 절차가 있어야 한다는 주장이다. 사후 대응만으로는 이미 발생한 피해를 되돌리기 어렵다는 문제의식이 함께 제기된다.',
      persuadedCount: 1620,
      evidences: [
        {
          id: 'ai-agree-1-ev-1',
          type: EvidenceType.FACT,
          source: '국회 입법조사처',
          date: '2026.07.09',
          summary:
            '인공지능 서비스 관련 이용자 피해 상담 건수가 최근 몇 년 사이 꾸준히 늘었다는 통계를 정리했다.',
          url: 'https://example.com/ai/safety-complaint-brief',
        },
        {
          id: 'ai-agree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '정보통신정책연구기관 보고서',
          date: '2026.07.21',
          summary:
            '생성형 모델의 오답과 편향이 이용자 의사결정에 미치는 영향을 실험으로 분석했다.',
          url: 'https://example.com/ai/model-bias-study',
        },
        {
          id: 'ai-agree-1-ev-3',
          type: EvidenceType.EXPERT,
          source: '인공지능 연구자 인터뷰',
          date: '2026.08.03',
          summary:
            '위험도가 높은 활용 영역만이라도 배포 전 평가를 의무화할 필요가 있다고 설명했다.',
          url: 'https://example.com/ai/researcher-interview-safety',
        },
        {
          id: 'ai-agree-1-ev-4',
          type: EvidenceType.CLAIM,
          source: '시민단체 성명',
          date: '2026.08.10',
          summary:
            '이용자 보호를 위한 최소한의 안전성 기준을 법으로 정해야 한다는 입장을 밝혔다.',
          url: 'https://example.com/ai/civic-statement-safety',
        },
      ],
    },
    {
      id: 'ai-agree-2',
      side: ClaimSide.AGREE,
      title: '학습 데이터의 권리 관계를 정리해야 한다',
      description:
        '창작물이 동의 없이 학습에 쓰이는 상황을 제도적으로 정리해야 한다는 주장이다. 이용 범위와 보상 기준이 명확해져야 창작자와 개발자 모두 예측 가능하게 활동할 수 있다는 논리다.',
      persuadedCount: 1240,
      evidences: [
        {
          id: 'ai-agree-2-ev-1',
          type: EvidenceType.RESEARCH,
          source: '저작권 정책연구기관 보고서',
          date: '2026.07.16',
          summary:
            '학습 데이터 이용에 대한 국내외 법적 판단이 아직 일관되지 않다는 점을 정리했다.',
          url: 'https://example.com/ai/copyright-policy-report',
        },
        {
          id: 'ai-agree-2-ev-2',
          type: EvidenceType.FACT,
          source: '국제기구 권고안',
          date: '2026.07.28',
          summary:
            '학습에 사용한 데이터의 출처를 공개하도록 권고하는 내용이 포함됐다.',
          url: 'https://example.com/ai/international-guideline-data',
        },
        {
          id: 'ai-agree-2-ev-3',
          type: EvidenceType.CLAIM,
          source: '창작자단체 성명',
          date: '2026.08.07',
          summary:
            '학습 이용에 대한 사전 동의와 보상 체계를 요구하는 입장을 발표했다.',
          url: 'https://example.com/ai/creator-statement-consent',
        },
      ],
    },
    {
      id: 'ai-agree-3',
      side: ClaimSide.AGREE,
      title: '피해가 생겼을 때 책임 소재가 분명해야 한다',
      description:
        '인공지능이 관여한 결정으로 손해가 발생했을 때 누가 책임을 지는지 현재는 모호하다는 지적이다. 책임 규정이 마련돼야 이용자가 구제를 받고 사업자도 기준에 맞춰 대비할 수 있다는 주장이다.',
      persuadedCount: 870,
      evidences: [
        {
          id: 'ai-agree-3-ev-1',
          type: EvidenceType.EXPERT,
          source: '정보법학 교수 기고',
          date: '2026.07.24',
          summary:
            '현행 법 체계로는 자동화된 판단의 책임 귀속을 다루기 어렵다고 지적했다.',
          url: 'https://example.com/ai/legal-column-liability',
        },
        {
          id: 'ai-agree-3-ev-2',
          type: EvidenceType.FACT,
          source: '소비자 분쟁조정 통계',
          date: '2026.08.05',
          summary:
            '알고리즘 판단과 관련한 분쟁 접수 건수가 전년 대비 늘어난 것으로 집계됐다.',
          url: 'https://example.com/ai/dispute-statistics',
        },
      ],
    },
    {
      id: 'ai-disagree-1',
      side: ClaimSide.DISAGREE,
      title: '규제가 앞서면 기술 개발 속도가 늦어진다',
      description:
        '기준이 확정되기 전에 규제가 도입되면 시험적인 시도가 위축될 수 있다는 우려다. 해외 개발 환경과 격차가 벌어지면 국내에서 성장할 기회를 놓칠 수 있다는 주장이 함께 제기된다.',
      persuadedCount: 1930,
      evidences: [
        {
          id: 'ai-disagree-1-ev-1',
          type: EvidenceType.FACT,
          source: '과학기술 통계 자료',
          date: '2026.07.11',
          summary:
            '국내 인공지능 분야 연구개발 투자 규모가 주요국에 비해 작은 수준으로 나타났다.',
          url: 'https://example.com/ai/rnd-investment-statistics',
        },
        {
          id: 'ai-disagree-1-ev-2',
          type: EvidenceType.RESEARCH,
          source: '산업연구기관 보고서',
          date: '2026.07.26',
          summary:
            '사전 규제가 강한 환경에서 신규 서비스 출시 주기가 길어지는 경향을 분석했다.',
          url: 'https://example.com/ai/regulation-speed-analysis',
        },
        {
          id: 'ai-disagree-1-ev-3',
          type: EvidenceType.CLAIM,
          source: '산업계 협회 입장문',
          date: '2026.08.04',
          summary:
            '기술 성숙 단계를 고려한 단계적 접근이 필요하다는 의견을 공식적으로 밝혔다.',
          url: 'https://example.com/ai/industry-statement-pace',
        },
        {
          id: 'ai-disagree-1-ev-4',
          type: EvidenceType.EXPERT,
          source: '기술경제 연구자 인터뷰',
          date: '2026.08.14',
          summary:
            '규제 설계가 늦더라도 실증 결과를 본 뒤 정하는 편이 낫다고 설명했다.',
          url: 'https://example.com/ai/tech-economist-interview',
        },
      ],
    },
    {
      id: 'ai-disagree-2',
      side: ClaimSide.DISAGREE,
      title: '기존 법으로도 상당 부분 대응할 수 있다',
      description:
        '개인정보, 소비자 보호, 저작권 등 이미 있는 법률로 다수의 문제를 다룰 수 있다는 주장이다. 새로운 법을 따로 만들면 규정이 중복되고 현장 혼선만 커질 수 있다는 우려가 제기된다.',
      persuadedCount: 1450,
      evidences: [
        {
          id: 'ai-disagree-2-ev-1',
          type: EvidenceType.FACT,
          source: '국회 입법조사처',
          date: '2026.07.18',
          summary:
            '인공지능 관련 사안에 적용 가능한 현행 법령을 분야별로 정리한 자료다.',
          url: 'https://example.com/ai/existing-law-review',
        },
        {
          id: 'ai-disagree-2-ev-2',
          type: EvidenceType.EXPERT,
          source: '행정법 교수 기고',
          date: '2026.08.01',
          summary:
            '개별 법 개정으로 공백을 메우는 방식이 더 현실적이라고 평가했다.',
          url: 'https://example.com/ai/administrative-law-column',
        },
        {
          id: 'ai-disagree-2-ev-3',
          type: EvidenceType.RESEARCH,
          source: '규제정책연구기관 보고서',
          date: '2026.08.12',
          summary:
            '신규 법 제정 시 기존 규정과 중복되는 항목이 다수 발생할 수 있다고 분석했다.',
          url: 'https://example.com/ai/regulatory-overlap-report',
        },
      ],
    },
    {
      id: 'ai-disagree-3',
      side: ClaimSide.DISAGREE,
      title: '규제 대상을 정의하기가 아직 어렵다',
      description:
        '인공지능의 범위가 넓고 활용 방식도 빠르게 바뀌어 규제 대상을 특정하기 쉽지 않다는 지적이다. 정의가 모호한 상태에서 규정을 만들면 관련 없는 서비스까지 부담을 지게 될 수 있다는 주장이다.',
      persuadedCount: 1010,
      evidences: [
        {
          id: 'ai-disagree-3-ev-1',
          type: EvidenceType.RESEARCH,
          source: '정보통신정책연구기관 보고서',
          date: '2026.07.30',
          summary:
            '국가별 인공지능 정의 규정이 서로 다르게 설정돼 있다는 비교 분석을 담았다.',
          url: 'https://example.com/ai/definition-comparison',
        },
        {
          id: 'ai-disagree-3-ev-2',
          type: EvidenceType.CLAIM,
          source: '중소 기술기업 협회 입장문',
          date: '2026.08.09',
          summary:
            '광범위한 정의가 적용되면 소규모 개발사의 부담이 커진다는 의견을 밝혔다.',
          url: 'https://example.com/ai/small-firm-statement',
        },
      ],
    },
  ],
  mediaPerspectives: [
    {
      leaning: MediaLeaning.PROGRESSIVE,
      articleCount: 16,
      frame: '인공지능 확산에 따른 이용자 보호와 노동 영향 문제',
      keywords: ['이용자 보호', '알고리즘 책임', '고용 영향'],
      representativeArticle: {
        title: '인공지능 피해 구제, 제도는 어디까지 왔나',
        source: '진보 성향 매체',
        url: 'https://example.com/ai/media-progressive',
      },
    },
    {
      leaning: MediaLeaning.CENTRIST,
      articleCount: 13,
      frame: '규제 수준과 산업 육성 사이의 균형 설계',
      keywords: ['규제 범위', '단계적 적용', '해외 입법 동향'],
      representativeArticle: {
        title: 'AI 법제 논의, 쟁점은 적용 범위에 있다',
        source: '중도 성향 매체',
        url: 'https://example.com/ai/media-centrist',
      },
    },
    {
      leaning: MediaLeaning.CONSERVATIVE,
      articleCount: 15,
      frame: '기술 경쟁력과 국내 개발 환경의 부담',
      keywords: ['산업 경쟁력', '투자 위축 우려', '규제 중복'],
      representativeArticle: {
        title: '개발 현장에서 본 AI 규제 논의의 조건',
        source: '보수 성향 매체',
        url: 'https://example.com/ai/media-conservative',
      },
    },
  ],
  commonCoverage: [
    '국회와 정부에서 인공지능 법제 정비 논의가 진행되고 있다는 사실',
    '규제 대상과 적용 범위를 어떻게 정할지가 핵심 쟁점이라는 점',
    '해외에서도 인공지능 관련 입법 논의가 동시에 진행되고 있다는 점',
  ],
  opinionGroups: [
    {
      id: 'ai-group-a',
      label: '그룹 A',
      share: 33,
      description: '기술 발전은 지지하지만 안전 장치가 먼저라고 보는 사람들',
      agreesWith: ['ai-agree-1', 'ai-agree-3'],
      disagreesWith: ['ai-disagree-1'],
      mostDivided: ['ai-disagree-2'],
    },
    {
      id: 'ai-group-b',
      label: '그룹 B',
      share: 30,
      description: '규제 필요성은 인정하지만 시점이 이르다고 보는 사람들',
      agreesWith: ['ai-disagree-2'],
      disagreesWith: ['ai-agree-1'],
      mostDivided: ['ai-agree-2', 'ai-disagree-3'],
    },
    {
      id: 'ai-group-c',
      label: '그룹 C',
      share: 21,
      description: '산업 경쟁력을 이유로 시장 자율을 선호하는 사람들',
      agreesWith: ['ai-disagree-1', 'ai-disagree-3'],
      disagreesWith: ['ai-agree-2'],
      mostDivided: ['ai-agree-3'],
    },
  ],
};
