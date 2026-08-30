import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VoteChoice } from '@/domain/VoteChoice';
import { InMemoryVoteStore } from '@/server/InMemoryVoteStore';
import { handleAuthCallback } from '@/server/handleAuthCallback';
import { signCookieValue } from '@/server/signedCookie';
import type { VoteStore } from '@/server/VoteStore';
import { FakeAuthGateway } from '@/testing/FakeAuthGateway';

const SECRET = 'test-secret';
const SLUG = 'work-week-4-5';
const ISSUE_ID = 'issue-1';
const ANON_ID = 'anon-1';
const USER_ID = 'user-1';

const signedAnonCookie = signCookieValue(ANON_ID, SECRET);

let store: InMemoryVoteStore;

beforeEach(() => {
  store = new InMemoryVoteStore({ issues: { [SLUG]: ISSUE_ID } });
  store.seedAnonVote(ISSUE_ID, ANON_ID, VoteChoice.AGREE);
});

describe('handleAuthCallback', () => {
  it('코드가 없으면 로그인 오류로 보낸다', async () => {
    const gateway = new FakeAuthGateway();

    const result = await handleAuthCallback({
      code: null,
      next: '/me',
      gateway,
      store,
      secret: SECRET,
      anonCookieValue: signedAnonCookie,
    });

    expect(result).toEqual({ redirectTo: '/login?error=1', clearAnonCookie: false });
    expect(gateway.exchangedCodes).toEqual([]);
  });

  it('코드 교환에 실패하면 로그인 오류로 보낸다', async () => {
    const result = await handleAuthCallback({
      code: 'bad-code',
      next: '/me',
      gateway: new FakeAuthGateway({ userId: null }),
      store,
      secret: SECRET,
      anonCookieValue: signedAnonCookie,
    });

    expect(result).toEqual({ redirectTo: '/login?error=1', clearAnonCookie: false });
  });

  it('성공하면 익명 표를 옮기고 next 로 보낸다', async () => {
    const gateway = new FakeAuthGateway({ userId: USER_ID });

    const result = await handleAuthCallback({
      code: 'good-code',
      next: '/issues/work-week-4-5#vote',
      gateway,
      store,
      secret: SECRET,
      anonCookieValue: signedAnonCookie,
    });

    expect(gateway.exchangedCodes).toEqual(['good-code']);
    expect(result).toEqual({ redirectTo: '/issues/work-week-4-5#vote', clearAnonCookie: true });
    await expect(store.getMyVote(ISSUE_ID, USER_ID)).resolves.toBe(VoteChoice.AGREE);
  });

  it('외부 URL 이 next 로 오면 홈으로 보낸다', async () => {
    const result = await handleAuthCallback({
      code: 'good-code',
      next: 'https://evil.test',
      gateway: new FakeAuthGateway({ userId: USER_ID }),
      store,
      secret: SECRET,
      anonCookieValue: undefined,
    });

    expect(result).toEqual({ redirectTo: '/', clearAnonCookie: false });
  });

  it('목 데이터 모드(저장소 없음)면 이전을 건너뛴다', async () => {
    const result = await handleAuthCallback({
      code: 'good-code',
      next: '/me',
      gateway: new FakeAuthGateway({ userId: USER_ID }),
      store: null,
      secret: SECRET,
      anonCookieValue: signedAnonCookie,
    });

    expect(result).toEqual({ redirectTo: '/me', clearAnonCookie: false });
  });

  it('이전이 실패해도 로그인은 성공으로 다룬다', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const brokenStore = {
      ...store,
      claimAnonRecords: async () => {
        throw new Error('DB 실패');
      },
    } as unknown as VoteStore;

    const result = await handleAuthCallback({
      code: 'good-code',
      next: '/me',
      gateway: new FakeAuthGateway({ userId: USER_ID }),
      store: brokenStore,
      secret: SECRET,
      anonCookieValue: signedAnonCookie,
    });

    expect(result).toEqual({ redirectTo: '/me', clearAnonCookie: false });
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
