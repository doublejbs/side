'use server';

import { timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { IssueStatus } from '@/domain/IssueStatus';
import { MEDIA_LEANING_ORDER } from '@/domain/mediaLeaningOrder';
import { getOpinionGroupLabel } from '@/domain/opinionGroupPresenter';
import { RegenerateNotAllowedError } from '@/pipeline/RegenerateNotAllowedError';
import { regenerateIssue } from '@/pipeline/regenerateIssue';
import { toAdminMessage } from '@/server/AdminActionError';
import { AdminFormField } from '@/server/AdminFormField';
import { AdminMessage } from '@/server/AdminMessage';
import type { AdminStore } from '@/server/AdminStore';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DURATION_MS,
  createAdminSessionCookie,
} from '@/server/adminSession';
import { parseEvidenceType, parseMediaLeaning } from '@/server/adminEnumParsers';
import {
  KEY_POINT_COUNT,
  MEDIA_PERSPECTIVE_COUNT,
  OPINION_GROUP_COUNT,
  claimDescriptionField,
  claimTitleField,
  evidenceTypeField,
  groupDescriptionField,
  groupIdField,
  groupShareField,
  keyPointIdField,
  keyPointQuestionField,
  keyPointTitleField,
  mediaArticleCountField,
  mediaFrameField,
  mediaKeywordsField,
  mediaLeaningField,
  mediaSourceField,
  mediaTitleField,
  mediaUrlField,
} from '@/server/adminFormFields';
import {
  addSearchQuery,
  assertReviewable,
  deleteEvidence,
  publishIssue,
  rejectIssue,
  restoreIssue,
  saveClaim,
  saveIssue,
  savePublisher,
  updateEvidenceType,
  type SaveIssueInput,
} from '@/server/adminUseCases';
import { getAdminStore, isAdminDatabaseConnected } from '@/server/getAdminStore';
import { getPipelineDeps } from '@/server/getPipelineDeps';
import { logServerError } from '@/server/logServerError';
import { requireAdminSession } from '@/server/requireAdminSession';
import type { PublicPageTarget } from '@/server/PublicPageTargets';

const LOGIN_PATH = '/admin/login';

/**
 * 공개 화면은 ISR(60초)로 굳어 있다. 승인·반려가 끝나면 그 경로들을 즉시 다시 만들게 한다.
 * 동적 경로는 'page' 타입을 함께 넘겨야 모든 slug 가 무효화된다.
 * 근거: `docs/PipelineSpec.md` 6장.
 */
const revalidatePublicPages = (targets: PublicPageTarget[]): void => {
  targets.forEach((target) => {
    if (target.isDynamicPage) {
      revalidatePath(target.path, 'page');

      return;
    }

    revalidatePath(target.path);
  });
};

const readText = (formData: FormData, name: string): string => {
  const value = formData.get(name);

  return typeof value === 'string' ? value : '';
};

const range = (length: number): number[] => Array.from({ length }, (_, index) => index);

/** 관리자 밖으로 나가는 경로는 허용하지 않는다. */
const sanitizeNextPath = (value: string): string => {
  if (value === '/admin' || (value.startsWith('/admin/') && !value.startsWith('/admin//'))) {
    return value;
  }

  return '/admin';
};

const isPasswordMatch = (input: string, expected: string): boolean => {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
};

const parseIssueForm = (formData: FormData): SaveIssueInput => {
  const claimIds = formData
    .getAll(AdminFormField.CLAIM_IDS)
    .filter((value): value is string => typeof value === 'string');

  return {
    issueId: readText(formData, AdminFormField.ISSUE_ID),
    question: readText(formData, AdminFormField.QUESTION),
    tags: readText(formData, AdminFormField.TAGS),
    summary: readText(formData, AdminFormField.SUMMARY),
    keyPoints: range(KEY_POINT_COUNT).map((index) => ({
      id: readText(formData, keyPointIdField(index)),
      title: readText(formData, keyPointTitleField(index)),
      question: readText(formData, keyPointQuestionField(index)),
    })),
    commonCoverage: readText(formData, AdminFormField.COMMON_COVERAGE),
    mediaPerspectives: range(MEDIA_PERSPECTIVE_COUNT).map((index) => ({
      leaning:
        parseMediaLeaning(readText(formData, mediaLeaningField(index))) ??
        MEDIA_LEANING_ORDER[index],
      articleCount: Number(readText(formData, mediaArticleCountField(index))),
      frame: readText(formData, mediaFrameField(index)),
      keywords: readText(formData, mediaKeywordsField(index)),
      representativeTitle: readText(formData, mediaTitleField(index)),
      representativeSource: readText(formData, mediaSourceField(index)),
      representativeUrl: readText(formData, mediaUrlField(index)),
    })),
    opinionGroups: range(OPINION_GROUP_COUNT).map((index) => ({
      id: readText(formData, groupIdField(index)),
      label: getOpinionGroupLabel(index),
      share: Number(readText(formData, groupShareField(index))),
      description: readText(formData, groupDescriptionField(index)),
    })),
    claims: claimIds.map((claimId) => ({
      id: claimId,
      title: readText(formData, claimTitleField(claimId)),
      description: readText(formData, claimDescriptionField(claimId)),
    })),
  };
};

/**
 * 모든 관리자 액션의 공통 껍데기.
 * DB 가 없으면 안내를 돌려주고, 실패는 화면용 코드로 바꿔 리다이렉트에 싣는다.
 */
const runAction = async (
  task: (store: AdminStore) => Promise<AdminMessage>,
): Promise<AdminMessage> => {
  await requireAdminSession();

  if (!isAdminDatabaseConnected()) {
    return AdminMessage.ERROR_NO_DATABASE;
  }

  try {
    const message = await task(getAdminStore());

    revalidatePath('/admin', 'layout');

    return message;
  } catch (error) {
    logServerError('[admin]', error);

    return toAdminMessage(error);
  }
};

const issuePath = (issueId: string, message: AdminMessage): string =>
  `/admin/issues/${issueId}?message=${message}`;

export const loginAction = async (formData: FormData): Promise<void> => {
  const nextPath = sanitizeNextPath(readText(formData, AdminFormField.NEXT));
  const password = readText(formData, AdminFormField.PASSWORD);
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.ANON_COOKIE_SECRET;

  if (!expected || !secret || !isPasswordMatch(password, expected)) {
    redirect(`${LOGIN_PATH}?error=1&${AdminFormField.NEXT}=${encodeURIComponent(nextPath)}`);
  }

  const cookieStore = await cookies();

  cookieStore.set({
    name: ADMIN_COOKIE_NAME,
    value: createAdminSessionCookie(secret),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: ADMIN_SESSION_DURATION_MS / 1000,
  });

  redirect(nextPath);
};

export const logoutAction = async (): Promise<void> => {
  const cookieStore = await cookies();

  cookieStore.delete({ name: ADMIN_COOKIE_NAME, path: '/admin' });

  redirect(LOGIN_PATH);
};

export const saveIssueAction = async (formData: FormData): Promise<void> => {
  const issueId = readText(formData, AdminFormField.ISSUE_ID);
  const message = await runAction(async (store) => {
    await saveIssue(store, parseIssueForm(formData));

    return AdminMessage.SAVED;
  });

  redirect(issuePath(issueId, message));
};

export const saveClaimAction = async (formData: FormData): Promise<void> => {
  const issueId = readText(formData, AdminFormField.ISSUE_ID);
  const claimId = readText(formData, AdminFormField.CLAIM_ID);
  const message = await runAction(async (store) => {
    await saveClaim(store, {
      id: claimId,
      title: readText(formData, claimTitleField(claimId)),
      description: readText(formData, claimDescriptionField(claimId)),
    });

    return AdminMessage.CLAIM_SAVED;
  });

  redirect(issuePath(issueId, message));
};

export const publishIssueAction = async (formData: FormData): Promise<void> => {
  const issueId = readText(formData, AdminFormField.ISSUE_ID);
  const message = await runAction(async (store) => {
    // 상태를 먼저 확인한다. 승인할 수 없는 이슈인데 폼 값만 저장되고 끝나면 안 된다.
    await assertReviewable(store, issueId);
    await saveIssue(store, parseIssueForm(formData));
    await publishIssue(store, issueId, { revalidatePublicPages });

    return AdminMessage.PUBLISHED;
  });

  redirect(issuePath(issueId, message));
};

export const rejectIssueAction = async (formData: FormData): Promise<void> => {
  const issueId = readText(formData, AdminFormField.ISSUE_ID);
  const message = await runAction(async (store) => {
    await rejectIssue(store, issueId, readText(formData, AdminFormField.REVIEW_NOTE), {
      revalidatePublicPages,
    });

    return AdminMessage.REJECTED;
  });

  redirect(issuePath(issueId, message));
};

/**
 * 자동 제외·반려된 이슈를 검수 대상으로 되돌린다.
 * 성공하면 되돌아간 초안 목록으로 보내 오탐을 이어서 다룰 수 있게 한다.
 */
export const restoreIssueAction = async (formData: FormData): Promise<void> => {
  const issueId = readText(formData, AdminFormField.ISSUE_ID);
  const message = await runAction(async (store) => {
    await restoreIssue(store, issueId);

    return AdminMessage.RESTORED;
  });

  if (message === AdminMessage.RESTORED) {
    redirect(`/admin?status=${IssueStatus.DRAFT}&message=${message}`);
  }

  redirect(issuePath(issueId, message));
};

export const updateEvidenceTypeAction = async (formData: FormData): Promise<void> => {
  const issueId = readText(formData, AdminFormField.ISSUE_ID);
  const evidenceId = readText(formData, AdminFormField.EVIDENCE_ID);
  const message = await runAction(async (store) => {
    const type = parseEvidenceType(readText(formData, evidenceTypeField(evidenceId)));

    if (!type) {
      return AdminMessage.ERROR_UNKNOWN;
    }

    await updateEvidenceType(store, issueId, evidenceId, type);

    return AdminMessage.EVIDENCE_SAVED;
  });

  redirect(issuePath(issueId, message));
};

export const deleteEvidenceAction = async (formData: FormData): Promise<void> => {
  const issueId = readText(formData, AdminFormField.ISSUE_ID);
  const evidenceId = readText(formData, AdminFormField.EVIDENCE_ID);
  const message = await runAction(async (store) => {
    await deleteEvidence(store, issueId, evidenceId);

    return AdminMessage.EVIDENCE_DELETED;
  });

  redirect(issuePath(issueId, message));
};

/**
 * 해당 이슈만 요약~출처 연결을 다시 돌린다. 근거: docs/PipelineSpec.md 5장.
 * Prisma·OpenAI 조립은 `getPipelineDeps()` 경계에 맡기고 여기서는 결과만 화면 코드로 바꾼다.
 */
export const regenerateIssueAction = async (formData: FormData): Promise<void> => {
  await requireAdminSession();

  const issueId = readText(formData, AdminFormField.ISSUE_ID);

  if (!isAdminDatabaseConnected()) {
    redirect(issuePath(issueId, AdminMessage.ERROR_NO_DATABASE));
  }

  const deps = getPipelineDeps();

  if (!deps) {
    redirect(issuePath(issueId, AdminMessage.ERROR_PIPELINE_ENV));
  }

  let message = AdminMessage.REGENERATED;

  try {
    await regenerateIssue({ prisma: deps.prisma, textClient: deps.textClient, issueId });

    revalidatePath('/admin', 'layout');
  } catch (error) {
    if (error instanceof RegenerateNotAllowedError) {
      message = AdminMessage.ERROR_REGENERATE_NOT_ALLOWED;
    } else {
      logServerError('[admin] regenerate', error);
      message = AdminMessage.ERROR_REGENERATE_FAILED;
    }
  }

  redirect(issuePath(issueId, message));
};

export const createQueryAction = async (formData: FormData): Promise<void> => {
  const message = await runAction(async (store) => {
    await addSearchQuery(store, readText(formData, AdminFormField.KEYWORD));

    return AdminMessage.QUERY_SAVED;
  });

  redirect(`/admin/queries?message=${message}`);
};

export const setQueryActiveAction = async (formData: FormData): Promise<void> => {
  const message = await runAction(async (store) => {
    await store.setQueryActive(
      readText(formData, AdminFormField.QUERY_ID),
      readText(formData, AdminFormField.IS_ACTIVE) === 'true',
    );

    return AdminMessage.QUERY_SAVED;
  });

  redirect(`/admin/queries?message=${message}`);
};

export const savePublisherAction = async (formData: FormData): Promise<void> => {
  const message = await runAction(async (store) => {
    await savePublisher(store, {
      domain: readText(formData, AdminFormField.DOMAIN),
      name: readText(formData, AdminFormField.NAME),
      leaning: parseMediaLeaning(readText(formData, AdminFormField.LEANING)),
    });

    return AdminMessage.PUBLISHER_SAVED;
  });

  redirect(`/admin/publishers?message=${message}`);
};

export const deletePublisherAction = async (formData: FormData): Promise<void> => {
  const message = await runAction(async (store) => {
    await store.deletePublisher(readText(formData, AdminFormField.PUBLISHER_ID));

    return AdminMessage.PUBLISHER_DELETED;
  });

  redirect(`/admin/publishers?message=${message}`);
};
