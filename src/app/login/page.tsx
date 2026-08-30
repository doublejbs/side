import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginPageView } from '@/components/auth/LoginPageView';
import { sanitizeNextPath } from '@/lib/auth/buildLoginHref';
import { isAuthEnabled } from '@/lib/auth/isAuthEnabled';
import { getSessionUser } from '@/lib/supabase/getSessionUser';

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export const metadata: Metadata = {
  title: '로그인 · SIDE',
};

/** 콜백이 실패했을 때 붙여 보내는 값(`/login?error=1`). 근거: docs/AuthSpec.md 4.1. */
const ERROR_FLAG = '1';

const LoginPage = async ({ searchParams }: Props) => {
  const { next, error } = await searchParams;
  const nextPath = sanitizeNextPath(next);
  const isEnabled = isAuthEnabled();

  // 이미 로그인했다면 로그인 화면을 보여줄 이유가 없다.
  if (isEnabled && (await getSessionUser())) {
    redirect(nextPath);
  }

  return <LoginPageView next={nextPath} hasError={error === ERROR_FLAG} isAuthEnabled={isEnabled} />;
};

export default LoginPage;
