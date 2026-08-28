import type { ReactNode } from 'react';

import { logoutAction } from '@/app/admin/AdminActions';
import { AdminTopBarView } from '@/components/admin/AdminTopBarView';

interface Props {
  children: ReactNode;
}

/** 로그인 페이지를 뺀 관리자 화면에만 상단 바를 붙인다. */
const AdminReviewLayout = ({ children }: Props) => (
  <>
    <AdminTopBarView logoutAction={logoutAction} />
    {children}
  </>
);

export default AdminReviewLayout;
