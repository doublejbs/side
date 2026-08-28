import type { OpinionGroup } from '@/domain/Issue';

/** 발견 화면의 그룹 카드에서 쓰는 경량 그룹 정보. 주장 id 목록은 넘기지 않는다. */
export interface OpinionGroupSummary {
  id: string;
  label: string;
  /** 퍼센트 */
  share: number;
  description: string;
}

export const toOpinionGroupSummary = (group: OpinionGroup): OpinionGroupSummary => ({
  id: group.id,
  label: group.label,
  share: group.share,
  description: group.description,
});
