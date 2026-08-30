import { describe, expect, it } from 'vitest';

import { ClaimSide } from '@/domain/ClaimSide';
import { EvidenceType } from '@/domain/EvidenceType';
import { MediaLeaning } from '@/domain/MediaLeaning';
import { MockIssueRepository } from '@/data/MockIssueRepository';
import type { Issue } from '@/domain/Issue';

const repository = new MockIssueRepository();
const issues = await repository.listPublishedIssues();

const EXPECTED_ISSUES = [
  { slug: 'work-week-4-5', participantCount: 12481, distribution: { agree: 57, disagree: 31, unsure: 12 }, tags: ['노동', '경제'] },
  { slug: 'nuclear-expansion', participantCount: 8902, distribution: { agree: 44, disagree: 41, unsure: 15 }, tags: ['에너지', '환경'] },
  { slug: 'retirement-65', participantCount: 6317, distribution: { agree: 52, disagree: 29, unsure: 19 }, tags: ['노동', '복지'] },
  { slug: 'ai-regulation', participantCount: 5140, distribution: { agree: 38, disagree: 49, unsure: 13 }, tags: ['기술', '산업'] },
  { slug: 'property-tax', participantCount: 4760, distribution: { agree: 41, disagree: 46, unsure: 13 }, tags: ['부동산', '경제'] },
];

const claimsOf = (issue: Issue, side: ClaimSide) =>
  issue.claims.filter((claim) => claim.side === side);

describe('MockIssueRepository', () => {
  it('이슈 5건을 반환하고 주 4.5일제가 첫 번째다', () => {
    expect(issues).toHaveLength(5);
    expect(issues[0].slug).toBe('work-week-4-5');
  });

  it('목 데이터는 slug 와 id 가 같다', () => {
    issues.forEach((issue) => {
      expect(issue.slug).toBe(issue.id);
    });
  });

  it('listSlugs 는 이슈 순서대로 slug 를 반환한다', async () => {
    expect(await repository.listSlugs()).toEqual(issues.map((issue) => issue.slug));
  });

  it('listClaimParams 는 모든 이슈의 (slug, 주장 id) 조합을 돌려준다', async () => {
    const params = await repository.listClaimParams();
    const claimCount = issues.reduce((sum, issue) => sum + issue.claims.length, 0);

    expect(params).toHaveLength(claimCount);
    expect(params[0]).toEqual({ slug: issues[0].slug, claimId: issues[0].claims[0].id });
    params.forEach((param) => {
      expect(issues.some((issue) => issue.slug === param.slug)).toBe(true);
    });
  });

  it('브리프의 이슈 slug·참여자 수·분포·태그를 그대로 사용한다', () => {
    EXPECTED_ISSUES.forEach((expected, index) => {
      const issue = issues[index];

      expect(issue.slug).toBe(expected.slug);
      expect(issue.participantCount).toBe(expected.participantCount);
      expect(issue.distribution).toEqual(expected.distribution);
      expect(issue.tags).toEqual(expected.tags);
    });
  });

  it('slug로 이슈를 조회하고, 없는 slug는 null을 반환한다', async () => {
    expect((await repository.getIssueBySlug('work-week-4-5'))?.slug).toBe('work-week-4-5');
    expect((await repository.getIssueBySlug('nuclear-expansion'))?.slug).toBe('nuclear-expansion');
    expect(await repository.getIssueBySlug('not-exists')).toBeNull();
  });

  it('이슈 slug는 중복되지 않는다', () => {
    const slugs = new Set(issues.map((issue) => issue.slug));

    expect(slugs.size).toBe(issues.length);
  });

  it('모든 질문은 물음표로 끝난다', () => {
    issues.forEach((issue) => {
      expect(issue.question.endsWith('?')).toBe(true);
    });
  });

  it('모든 분포의 합은 100이다', () => {
    issues.forEach((issue) => {
      const { agree, disagree, unsure } = issue.distribution;

      expect(agree + disagree + unsure).toBe(100);
    });
  });

  it('각 이슈는 요약 3~4문장과 원문 기사 수를 가진다', () => {
    issues.forEach((issue) => {
      expect(issue.summary.length).toBeGreaterThanOrEqual(3);
      expect(issue.summary.length).toBeLessThanOrEqual(4);
      issue.summary.forEach((sentence) => {
        expect(sentence.trim().length).toBeGreaterThan(0);
      });
      expect(issue.sourceArticleCount).toBeGreaterThan(0);
    });
  });

  it('각 이슈는 언론 관점 비교에 쓰는 매체 수와 기간 라벨을 가진다', () => {
    issues.forEach((issue) => {
      expect(issue.mediaOutletCount).toBeGreaterThan(0);
      expect(issue.coveragePeriodLabel.length).toBeGreaterThan(0);
    });
  });

  it('각 이슈는 핵심 쟁점 4개를 가진다', () => {
    issues.forEach((issue) => {
      expect(issue.keyPoints).toHaveLength(4);
      issue.keyPoints.forEach((keyPoint) => {
        expect(keyPoint.title.length).toBeGreaterThan(0);
        expect(keyPoint.question.endsWith('?')).toBe(true);
      });
    });
  });

  it('각 이슈는 찬성 주장 3개와 반대 주장 3개를 가진다', () => {
    issues.forEach((issue) => {
      expect(claimsOf(issue, ClaimSide.AGREE)).toHaveLength(3);
      expect(claimsOf(issue, ClaimSide.DISAGREE)).toHaveLength(3);
    });
  });

  it('모든 주장은 설명과 근거 2개 이상을 가지며 근거에는 url과 날짜가 있다', () => {
    issues.forEach((issue) => {
      issue.claims.forEach((claim) => {
        expect(claim.description.length).toBeGreaterThan(0);
        expect(claim.persuadedCount).toBeGreaterThan(0);
        expect(claim.evidences.length).toBeGreaterThanOrEqual(2);

        claim.evidences.forEach((evidence) => {
          expect(evidence.url.startsWith('https://')).toBe(true);
          expect(evidence.date).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
          expect(evidence.source.length).toBeGreaterThan(0);
          expect(evidence.summary.length).toBeGreaterThan(0);
          expect(Object.values(EvidenceType)).toContain(evidence.type);
        });
      });
    });
  });

  it('주장 id는 이슈 안에서 중복되지 않는다', () => {
    issues.forEach((issue) => {
      const claimIds = new Set(issue.claims.map((claim) => claim.id));
      const evidenceIds = new Set(
        issue.claims.flatMap((claim) => claim.evidences.map((evidence) => evidence.id)),
      );

      expect(claimIds.size).toBe(issue.claims.length);
      expect(evidenceIds.size).toBe(
        issue.claims.reduce((sum, claim) => sum + claim.evidences.length, 0),
      );
    });
  });

  it('각 이슈는 진보·중도·보수 언론 관점 3개와 공통 보도 2~3개를 가진다', () => {
    issues.forEach((issue) => {
      expect(issue.mediaPerspectives).toHaveLength(3);
      expect(issue.mediaPerspectives.map((perspective) => perspective.leaning)).toEqual([
        MediaLeaning.PROGRESSIVE,
        MediaLeaning.CENTRIST,
        MediaLeaning.CONSERVATIVE,
      ]);

      issue.mediaPerspectives.forEach((perspective) => {
        expect(perspective.articleCount).toBeGreaterThan(0);
        expect(perspective.frame.length).toBeGreaterThan(0);
        expect(perspective.keywords.length).toBeGreaterThanOrEqual(3);
        expect(perspective.representativeArticle.url.startsWith('https://')).toBe(true);
      });

      expect(issue.commonCoverage.length).toBeGreaterThanOrEqual(2);
      expect(issue.commonCoverage.length).toBeLessThanOrEqual(3);
    });
  });

  it('각 이슈는 의견 그룹 3개를 가지고 그룹이 참조하는 주장이 실제로 존재한다', () => {
    issues.forEach((issue) => {
      const claimIds = new Set(issue.claims.map((claim) => claim.id));

      expect(issue.opinionGroups).toHaveLength(3);
      expect(issue.opinionGroups.map((group) => group.label)).toEqual([
        '그룹 A',
        '그룹 B',
        '그룹 C',
      ]);

      issue.opinionGroups.forEach((group) => {
        expect(group.share).toBeGreaterThan(0);
        expect(group.description.length).toBeGreaterThan(0);

        [...group.agreesWith, ...group.disagreesWith, ...group.mostDivided].forEach(
          (claimId) => {
            expect(claimIds.has(claimId)).toBe(true);
          },
        );

        expect(group.agreesWith.length).toBeGreaterThanOrEqual(1);
        expect(group.disagreesWith.length).toBeGreaterThanOrEqual(1);
        expect(group.mostDivided.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  it('getClaimById로 주장을 조회하고, 없는 조합은 null을 반환한다', async () => {
    const issue = issues[0];
    const claim = issue.claims[0];

    expect((await repository.getClaimById(issue.slug, claim.id))?.title).toBe(claim.title);
    expect(await repository.getClaimById(issue.slug, 'not-exists')).toBeNull();
    expect(await repository.getClaimById('not-exists', claim.id)).toBeNull();
  });
});
