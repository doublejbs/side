import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IssueCardView } from '@/components/home/IssueCardView';
import { MOCK_ISSUES } from '@/data/MockIssueRepository';

const issue = MOCK_ISSUES[0];

describe('IssueCardView', () => {
  it('질문과 태그 칩을 렌더한다', () => {
    render(<IssueCardView issue={issue} />);

    expect(screen.getByRole('heading', { name: issue.question })).toBeInTheDocument();
    issue.tags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('참여자 수를 천 단위로 구분해 보여준다', () => {
    render(<IssueCardView issue={issue} />);

    expect(screen.getByText('12,481명')).toBeInTheDocument();
  });

  it('찬성·반대·모르겠음 퍼센트를 모두 보여준다', () => {
    render(<IssueCardView issue={issue} />);

    expect(screen.getByText('찬성 57%')).toBeInTheDocument();
    expect(screen.getByText('반대 31%')).toBeInTheDocument();
    expect(screen.getByText('모르겠음 12%')).toBeInTheDocument();
  });

  it('카드 전체가 이슈 상세 링크다', () => {
    render(<IssueCardView issue={issue} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/issues/work-week-4-5');
  });

  it('featured 카드는 참여 문구와 "3분 만에 이해하기"를 보여준다', () => {
    render(<IssueCardView issue={issue} featured />);

    expect(screen.getByRole('article')).toHaveTextContent('12,481명 참여');
    expect(screen.getByText('3분 만에 이해하기')).toBeInTheDocument();
  });

  it('compact 카드는 "3분 만에 이해하기"를 보여주지 않는다', () => {
    render(<IssueCardView issue={issue} />);

    expect(screen.queryByText('3분 만에 이해하기')).not.toBeInTheDocument();
  });
});
