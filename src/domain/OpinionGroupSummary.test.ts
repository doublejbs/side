import { describe, expect, it } from 'vitest';

import { getIssues } from '@/data/IssueRepository';
import { toOpinionGroupSummary } from '@/domain/OpinionGroupSummary';

const group = getIssues()[0].opinionGroups[0];

describe('toOpinionGroupSummary', () => {
  it('그룹 카드에 필요한 값만 남긴다', () => {
    expect(toOpinionGroupSummary(group)).toEqual({
      id: group.id,
      label: group.label,
      share: group.share,
      description: group.description,
    });
  });
});
