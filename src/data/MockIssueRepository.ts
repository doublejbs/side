import { aiRegulationIssue } from '@/data/issues/AiRegulationIssue';
import { nuclearIssue } from '@/data/issues/NuclearIssue';
import { propertyTaxIssue } from '@/data/issues/PropertyTaxIssue';
import { retirementAgeIssue } from '@/data/issues/RetirementAgeIssue';
import { workWeekIssue } from '@/data/issues/WorkWeekIssue';
import type { ClaimRouteParams, IssueRepository } from '@/data/IssueRepository';
import type { Claim, Issue } from '@/domain/Issue';

/** `DATABASE_URL` 이 없을 때 앱이 쓰는 목 이슈 5건. 시드 스크립트도 이 배열을 그대로 넣는다. */
export const MOCK_ISSUES: Issue[] = [
  workWeekIssue,
  nuclearIssue,
  retirementAgeIssue,
  aiRegulationIssue,
  propertyTaxIssue,
];

const findBySlug = (slug: string): Issue | null =>
  MOCK_ISSUES.find((issue) => issue.slug === slug) ?? null;

export class MockIssueRepository implements IssueRepository {
  async listPublishedIssues(): Promise<Issue[]> {
    return MOCK_ISSUES;
  }

  async getIssueBySlug(slug: string): Promise<Issue | null> {
    return findBySlug(slug);
  }

  async getClaimById(slug: string, claimId: string): Promise<Claim | null> {
    return findBySlug(slug)?.claims.find((claim) => claim.id === claimId) ?? null;
  }

  async listSlugs(): Promise<string[]> {
    return MOCK_ISSUES.map((issue) => issue.slug);
  }

  async listClaimParams(): Promise<ClaimRouteParams[]> {
    return MOCK_ISSUES.flatMap((issue) =>
      issue.claims.map((claim) => ({ slug: issue.slug, claimId: claim.id })),
    );
  }
}
