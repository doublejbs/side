import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminPageLayoutView } from '@/components/admin/AdminPageLayoutView';

export const metadata: Metadata = {
  title: 'SIDE 관리자',
  robots: { index: false, follow: false },
};

interface Props {
  children: ReactNode;
}

const AdminLayout = ({ children }: Props) => <AdminPageLayoutView>{children}</AdminPageLayoutView>;

export default AdminLayout;
