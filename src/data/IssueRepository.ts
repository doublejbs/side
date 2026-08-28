import { aiRegulationIssue } from '@/data/issues/AiRegulationIssue';
import { nuclearIssue } from '@/data/issues/NuclearIssue';
import { propertyTaxIssue } from '@/data/issues/PropertyTaxIssue';
import { retirementAgeIssue } from '@/data/issues/RetirementAgeIssue';
import { workWeekIssue } from '@/data/issues/WorkWeekIssue';
import type { Claim, Issue } from '@/domain/Issue';

const ISSUES: Issue[] = [
  workWeekIssue,
  nuclearIssue,
  retirementAgeIssue,
  aiRegulationIssue,
  propertyTaxIssue,
];

export const getIssues = (): Issue[] => ISSUES;

export const getIssueById = (id: string): Issue | undefined =>
  ISSUES.find((issue) => issue.id === id);

export const getClaimById = (issueId: string, claimId: string): Claim | undefined =>
  getIssueById(issueId)?.claims.find((claim) => claim.id === claimId);
