import { describe, expect, it, vi } from 'vitest';

import { handleSignOut } from '@/server/handleSignOut';
import { FakeAuthGateway } from '@/testing/FakeAuthGateway';

describe('handleSignOut', () => {
  it('교차 출처 요청이면 로그아웃하지 않고 403 을 돌려준다', async () => {
    const gateway = new FakeAuthGateway();

    const result = await handleSignOut({ gateway, isSameOrigin: false });

    expect(result).toEqual({ status: 403, redirectTo: null, clearAnonCookie: false });
    expect(gateway.signOutCount).toBe(0);
  });

  it('동일 출처 요청이면 로그아웃하고 홈으로 보낸다', async () => {
    const gateway = new FakeAuthGateway();

    const result = await handleSignOut({ gateway, isSameOrigin: true });

    expect(result).toEqual({ status: 303, redirectTo: '/', clearAnonCookie: true });
    expect(gateway.signOutCount).toBe(1);
  });

  it('로그아웃이 실패해도 성공으로 다루고 로그만 남긴다', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const gateway = new FakeAuthGateway({ shouldThrow: true });

    const result = await handleSignOut({ gateway, isSameOrigin: true });

    expect(result).toEqual({ status: 303, redirectTo: '/', clearAnonCookie: true });
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
