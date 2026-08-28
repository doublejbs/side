import type { Metadata } from 'next';
import { IBM_Plex_Sans_KR } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppShellView } from '@/components/common/AppShellView';

import './globals.css';

const plexSansKr = IBM_Plex_Sans_KR({
  variable: '--font-plex-sans-kr',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIDE',
  description: '하나의 정치 이슈를 여러 관점에서 이해하는 플랫폼',
};

interface Props {
  children: ReactNode;
}

const RootLayout = ({ children }: Props) => (
  <html lang="ko" className={plexSansKr.variable}>
    <body>
      <AppShellView>{children}</AppShellView>
    </body>
  </html>
);

export default RootLayout;
