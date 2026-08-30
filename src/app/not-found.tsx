import type { Metadata } from 'next';

import { NotFoundView } from '@/components/common/NotFoundView';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없어요 · SIDE',
};

const NotFoundPage = () => <NotFoundView />;

export default NotFoundPage;
