import 'dotenv/config';

import { IssueStatus, Prisma, PrismaClient, VoteChoice } from '@prisma/client';

import { MOCK_ISSUES } from '../src/data/MockIssueRepository';
import { toPrismaClaimSide, toPrismaEvidenceType } from '../src/data/PrismaEnumMappers';
import { ClaimSide as DomainClaimSide } from '../src/domain/ClaimSide';
import { PUBLISHER_DIRECTORY } from '../src/pipeline/publisherDirectory';
import type { Issue, VoteDistribution } from '../src/domain/Issue';

/** 시드 이슈 간 publishedAt 간격(1분) — 목 데이터 순서를 홈 정렬에 반영 */
const SEED_PUBLISH_GAP_MS = 60_000;

/** 관리자가 나중에 편집하는 기본 수집 키워드. */
const SEARCH_KEYWORDS = ['주 4.5일제', '원전 확대', '정년 연장', 'AI 규제', '부동산 보유세'];

/** `--with-demo-votes` 로 만드는 합성 투표의 최대 표 수. */
const DEMO_VOTE_LIMIT = 200;

/** 근거 요약에서 잘라 쓰는 기사 제목 길이. */
const ARTICLE_TITLE_LENGTH = 60;

const VOTE_CHOICE_BY_KEY: Record<keyof VoteDistribution, VoteChoice> = {
  agree: VoteChoice.AGREE,
  disagree: VoteChoice.DISAGREE,
  unsure: VoteChoice.UNSURE,
};

const DISTRIBUTION_KEYS: (keyof VoteDistribution)[] = ['agree', 'disagree', 'unsure'];

/** 도메인 객체를 Json 컬럼에 넣을 수 있는 형태로 직렬화한다. */
const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

/** 목 데이터의 `YYYY.MM.DD` 를 한국 시간 자정 기준 Date 로 바꾼다. */
const parseEvidenceDate = (value: string): Date => new Date(`${value.replace(/\./g, '-')}T00:00:00+09:00`);

const toDemoVotes = (issue: Issue): { anonId: string; choice: VoteChoice }[] => {
  const total = Math.min(issue.participantCount, DEMO_VOTE_LIMIT);
  const votes: { anonId: string; choice: VoteChoice }[] = [];

  DISTRIBUTION_KEYS.forEach((key) => {
    const count = Math.round((issue.distribution[key] / 100) * total);

    for (let index = 0; index < count; index += 1) {
      votes.push({
        anonId: `seed-${issue.slug}-${key}-${index}`,
        choice: VOTE_CHOICE_BY_KEY[key],
      });
    }
  });

  return votes;
};

const seedSearchQueries = async (prisma: PrismaClient): Promise<void> => {
  await Promise.all(
    SEARCH_KEYWORDS.map((keyword) =>
      prisma.searchQuery.upsert({
        where: { keyword },
        update: {},
        create: { keyword },
      }),
    ),
  );
};

/**
 * 매체 테이블은 도메인 → 매체명만 시드한다.
 * 성향(`leaning`)은 관리자가 `/admin/publishers` 에서 지정하므로 항상 null 로 둔다.
 */
const seedPublishers = async (prisma: PrismaClient): Promise<void> => {
  await Promise.all(
    PUBLISHER_DIRECTORY.map((entry) =>
      prisma.publisher.upsert({
        where: { domain: entry.domain },
        update: { name: entry.name },
        create: { domain: entry.domain, name: entry.name, leaning: null },
      }),
    ),
  );
};

/**
 * 근거의 출처·링크·날짜로 최소한의 `Article` 행을 만들어 이슈에 붙인다.
 * 기사 수·매체 수 통계가 기사에서 파생되므로 목 이슈에도 기사가 있어야 한다.
 * 같은 url 을 여러 근거가 쓰면 행 하나를 재사용한다(`naverLink` 가 unique).
 */
const seedIssueArticles = async (
  prisma: PrismaClient,
  issueId: string,
  issue: Issue,
): Promise<Map<string, string>> => {
  const articleIdByUrl = new Map<string, string>();

  for (const claim of issue.claims) {
    for (const evidence of claim.evidences) {
      if (articleIdByUrl.has(evidence.url)) {
        continue;
      }

      const data = {
        originalLink: evidence.url,
        title: evidence.summary.slice(0, ARTICLE_TITLE_LENGTH),
        description: evidence.summary,
        publisher: evidence.source,
        publishedAt: parseEvidenceDate(evidence.date),
        embedding: [],
        issueId,
      };

      const article = await prisma.article.upsert({
        where: { naverLink: evidence.url },
        update: data,
        create: { naverLink: evidence.url, ...data },
        select: { id: true },
      });

      articleIdByUrl.set(evidence.url, article.id);
    }
  }

  return articleIdByUrl;
};

const seedIssue = async (
  prisma: PrismaClient,
  issue: Issue,
  withDemoVotes: boolean,
  order: number,
): Promise<void> => {
  // 홈은 publishedAt 내림차순이므로 목 데이터 순서(첫 이슈가 가장 최신)를 시간차로 보장한다.
  const publishedAt = new Date(Date.now() - order * SEED_PUBLISH_GAP_MS);
  const data = {
    status: IssueStatus.PUBLISHED,
    question: issue.question,
    tags: issue.tags,
    // 관점 축은 목 데이터에 수동 지정한 값을 그대로 저장한다(docs/PerspectiveSpec.md 1장).
    axes: toJsonValue(issue.axes),
    summary: issue.summary,
    keyPoints: toJsonValue(issue.keyPoints),
    commonCoverage: issue.commonCoverage,
    mediaPerspectives: toJsonValue(issue.mediaPerspectives),
    opinionGroups: toJsonValue(issue.opinionGroups),
    centroid: [],
    publishedAt,
  };

  const row = await prisma.issue.upsert({
    where: { slug: issue.slug },
    update: data,
    create: { slug: issue.slug, ...data },
    select: { id: true },
  });

  const articleIdByUrl = await seedIssueArticles(prisma, row.id, issue);

  // 주장·근거는 목 데이터를 그대로 다시 심는다(멱등).
  await prisma.claim.deleteMany({ where: { issueId: row.id } });

  let agreeOrder = 0;
  let disagreeOrder = 0;

  for (const claim of issue.claims) {
    const isAgree = claim.side === DomainClaimSide.AGREE;
    const order = isAgree ? agreeOrder : disagreeOrder;

    if (isAgree) {
      agreeOrder += 1;
    } else {
      disagreeOrder += 1;
    }

    await prisma.claim.create({
      data: {
        issueId: row.id,
        side: toPrismaClaimSide(claim.side),
        order,
        title: claim.title,
        description: claim.description,
        evidences: {
          create: claim.evidences.map((evidence) => ({
            type: toPrismaEvidenceType(evidence.type),
            source: evidence.source,
            date: parseEvidenceDate(evidence.date),
            summary: evidence.summary,
            url: evidence.url,
            articleId: articleIdByUrl.get(evidence.url) ?? null,
          })),
        },
      },
    });
  }

  await prisma.vote.deleteMany({ where: { issueId: row.id, anonId: { startsWith: 'seed-' } } });

  if (!withDemoVotes) {
    return;
  }

  await prisma.vote.createMany({
    data: toDemoVotes(issue).map((vote) => ({
      issueId: row.id,
      anonId: vote.anonId,
      choice: vote.choice,
    })),
    skipDuplicates: true,
  });
};

const run = async (): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL 이 없습니다. `docker compose up -d` 후 .env 에 DATABASE_URL 을 채워주세요.',
    );
    process.exit(1);
  }

  const withDemoVotes = process.argv.includes('--with-demo-votes');
  const prisma = new PrismaClient();

  try {
    await seedSearchQueries(prisma);
    await seedPublishers(prisma);

    for (const [order, issue] of MOCK_ISSUES.entries()) {
      await seedIssue(prisma, issue, withDemoVotes, order);
    }

    console.log(
      `시드 완료 — 이슈 ${MOCK_ISSUES.length}건, 검색 키워드 ${SEARCH_KEYWORDS.length}개, 매체 ${PUBLISHER_DIRECTORY.length}곳` +
        (withDemoVotes ? ' (데모 투표 포함)' : ' (투표 없음)'),
    );
  } finally {
    await prisma.$disconnect();
  }
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
