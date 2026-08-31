'use client';

import { useState } from 'react';

import {
  IssueAxesEditorView,
  type IssueAxisRow,
} from '@/components/admin/IssueAxesEditorView';
import { UNSET_AXIS_VALUE } from '@/server/adminFormFields';
import { AxisDirection } from '@/domain/AxisDirection';
import { MAX_ISSUE_AXES, type IssueAxis } from '@/domain/IssueAxis';
import { PerspectiveAxis } from '@/domain/PerspectiveAxis';
import { ALL_PERSPECTIVE_AXES } from '@/domain/perspectiveAxisLabels';

interface Props {
  /** 저장돼 있는 축. 0~2개다. */
  axes: IssueAxis[];
}

const parseAxis = (value: string): PerspectiveAxis | null =>
  ALL_PERSPECTIVE_AXES.find((axis) => axis === value) ?? null;

/** 저장된 축을 고정 칸 수에 맞춘다. 빈 칸은 미지정이고 방향은 왼쪽부터 보여준다. */
const toRows = (axes: IssueAxis[]): IssueAxisRow[] =>
  Array.from({ length: MAX_ISSUE_AXES }, (_, index) => ({
    axis: axes[index]?.axis ?? null,
    agreeDirection: axes[index]?.agreeDirection ?? AxisDirection.LEFT,
  }));

/**
 * 축 편집 칸에 선택 상태를 넣는다. 고른 축이 바뀌면 방향 라벨도 그 축의 좌우 라벨로 바뀐다.
 * 저장은 폼 제출(`saveIssueAction`)이 맡으므로 여기서는 서버를 부르지 않는다.
 */
export const IssueAxesEditorContainer = ({ axes }: Props) => {
  const [rows, setRows] = useState<IssueAxisRow[]>(() => toRows(axes));

  const handleAxisChange = (index: number, value: string): void => {
    const axis = value === UNSET_AXIS_VALUE ? null : parseAxis(value);

    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, axis } : row)),
    );
  };

  return <IssueAxesEditorView rows={rows} onAxisChange={handleAxisChange} />;
};
