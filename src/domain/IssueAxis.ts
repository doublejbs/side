import { AxisDirection } from '@/domain/AxisDirection';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

/**
 * 이슈 하나가 어떤 관점 축의 어느 방향에 걸려 있는지. 한 이슈에 0~2개 붙는다.
 * `agreeDirection` 은 "이 질문에 찬성하면 축의 어느 쪽인가"를 뜻한다.
 * 근거: docs/PerspectiveSpec.md 1장.
 */
export interface IssueAxis {
  axis: PerspectiveAxis;
  agreeDirection: AxisDirection;
}

/** 한 이슈에 붙일 수 있는 관점 축 수. 근거: docs/PerspectiveSpec.md 1장. */
export const MAX_ISSUE_AXES = 2;
