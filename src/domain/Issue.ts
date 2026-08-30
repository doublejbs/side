import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';

/** 퍼센트 값. agree + disagree + unsure = 100 */
export interface VoteDistribution {
  agree: number;
  disagree: number;
  unsure: number;
}

export interface KeyPoint {
  id: string;
  title: string;
  question: string;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  /** YYYY.MM.DD */
  date: string;
  summary: string;
  url: string;
}

export interface Claim {
  id: string;
  side: ClaimSide;
  title: string;
  description: string;
  persuadedCount: number;
  evidences: Evidence[];
}

export interface RepresentativeArticle {
  title: string;
  source: string;
  url: string;
}

export interface MediaPerspective {
  leaning: MediaLeaning;
  articleCount: number;
  frame: string;
  keywords: string[];
  representativeArticle: RepresentativeArticle;
}

export interface OpinionGroup {
  id: string;
  /** '그룹 A' */
  label: string;
  /** 퍼센트 */
  share: number;
  description: string;
  /** claimId 목록 */
  agreesWith: string[];
  disagreesWith: string[];
  mostDivided: string[];
}

export interface Issue {
  id: string;
  /** URL 식별자. 목 데이터는 id와 같은 값을 쓴다. */
  slug: string;
  question: string;
  tags: string[];
  participantCount: number;
  distribution: VoteDistribution;
  summary: string[];
  /** 요약을 만들 때 참고한 핵심 출처 기사 수. */
  sourceArticleCount: number;
  /** 언론 관점 비교에 사용한 매체 수. */
  mediaOutletCount: number;
  /** 언론 관점 비교 기간 라벨. 예: '최근 2주' */
  coveragePeriodLabel: string;
  keyPoints: KeyPoint[];
  claims: Claim[];
  mediaPerspectives: MediaPerspective[];
  commonCoverage: string[];
  opinionGroups: OpinionGroup[];
}
