import { loginAction } from '@/app/admin/AdminActions';
import { LoginFormView } from '@/components/admin/LoginFormView';
import { isAdminConfigured } from '@/server/adminSession';

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export const dynamic = 'force-dynamic';

const AdminLoginPage = async ({ searchParams }: Props) => {
  const { error, next } = await searchParams;

  return (
    <LoginFormView
      loginAction={loginAction}
      nextPath={next ?? '/admin'}
      hasError={error === '1'}
      isConfigured={isAdminConfigured()}
    />
  );
};

export default AdminLoginPage;
