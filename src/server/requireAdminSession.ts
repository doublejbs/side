import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/server/adminSession';

const LOGIN_PATH = '/admin/login';

/**
 * 쿠키 값 하나만 보고 관리자 세션이 유효한지 판단하는 순수 함수.
 * 비밀키가 없으면 검증 자체가 불가능하므로 항상 거부한다.
 */
export const hasValidAdminSession = (
  cookieValue: string | undefined,
  secret: string,
  now: Date = new Date(),
): boolean => {
  if (!secret) {
    return false;
  }

  return verifyAdminSession(cookieValue, secret, now.getTime());
};

/**
 * 서버 액션 진입점에서 관리자 세션을 확인한다.
 * proxy 미들웨어만으로는 서버 액션 호출을 막을 수 없어 액션 안에서 한 번 더 검증한다.
 */
export const requireAdminSession = async (): Promise<void> => {
  const secret = process.env.ANON_COOKIE_SECRET ?? '';
  const cookieStore = await cookies();

  if (!hasValidAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value, secret)) {
    redirect(LOGIN_PATH);
  }
};
