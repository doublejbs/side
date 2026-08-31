import { PerspectiveAxis } from '@/domain/PerspectiveAxis';

/** 축 하나의 표시 문구. 왼쪽·오른쪽 라벨은 `AxisDirection` 과 같은 방향을 가리킨다. */
export interface PerspectiveAxisLabels {
  name: string;
  leftLabel: string;
  rightLabel: string;
}

/** 화면·계산이 함께 쓰는 축 순서. 관점 카드도 이 순서로 보여준다. */
export const ALL_PERSPECTIVE_AXES: PerspectiveAxis[] = [
  PerspectiveAxis.ECONOMY,
  PerspectiveAxis.WELFARE,
  PerspectiveAxis.LABOR,
  PerspectiveAxis.ENVIRONMENT,
  PerspectiveAxis.DIPLOMACY,
];

/** 고정 축 정의. 근거: docs/PerspectiveSpec.md 1장. */
const AXIS_LABELS: Record<PerspectiveAxis, PerspectiveAxisLabels> = {
  [PerspectiveAxis.ECONOMY]: { name: '경제', leftLabel: '시장 중심', rightLabel: '정부 역할' },
  [PerspectiveAxis.WELFARE]: { name: '복지', leftLabel: '개인 책임', rightLabel: '사회 책임' },
  [PerspectiveAxis.LABOR]: { name: '노동', leftLabel: '기업 중심', rightLabel: '노동자 중심' },
  [PerspectiveAxis.ENVIRONMENT]: { name: '환경', leftLabel: '성장', rightLabel: '환경' },
  [PerspectiveAxis.DIPLOMACY]: { name: '외교', leftLabel: '현실주의', rightLabel: '이상주의' },
};

export const getAxisLabels = (axis: PerspectiveAxis): PerspectiveAxisLabels => AXIS_LABELS[axis];
