import { describe, expect, it } from 'vitest';

import { MOCK_ISSUES } from '@/data/MockIssueRepository';
import { toOpinionGroupSummary } from '@/domain/OpinionGroupSummary';

const group = MOCK_ISSUES[0].opinionGroups[0];

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
