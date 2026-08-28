import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { VoteResultContainer } from '@/components/result/VoteResultContainer';
import { getIssues } from '@/data/IssueRepository';
import { toIssueResultSummary } from '@/domain/IssueResultSummary';
import { VoteChoice } from '@/domain/VoteChoice';
import { setVote } from '@/store/UserRecordStore';

const issue = toIssueResultSummary(getIssues()[0]);

describe('VoteResultContainer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('투표 기록이 없으면 투표 안내 카드를 보여준다', () => {
    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByText('아직 이 이슈에 의견을 남기지 않았어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /의견 남기기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.id}#vote`,
    );
  });

  it('찬성에 투표했다면 반영된 분포와 반대 의견 CTA를 보여준다', () => {
    setVote(issue.id, VoteChoice.AGREE);

    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByText('12,482명이')).toBeInTheDocument();
    expect(screen.getByText('반대 의견 3개와 근거 9개를 읽어볼 수 있어요.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /반대 의견 읽어보기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.id}#disagree`,
    );
    expect(screen.getByText('비슷한 생각을 가진 사람들')).toBeInTheDocument();
  });

  it('반대에 투표했다면 찬성 의견 CTA를 보여준다', () => {
    setVote(issue.id, VoteChoice.DISAGREE);

    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByRole('link', { name: /찬성 의견 읽어보기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.id}#agree`,
    );
  });

  it('모르겠음에 투표했다면 찬성 의견 CTA를 보여준다', () => {
    setVote(issue.id, VoteChoice.UNSURE);

    render(<VoteResultContainer issue={issue} />);

    expect(screen.getByRole('link', { name: /찬성 의견 읽어보기/ })).toHaveAttribute(
      'href',
      `/issues/${issue.id}#agree`,
    );
  });
});
