import type { Metadata } from 'next';

import { LEGAL_EFFECTIVE_DATE } from '@/components/legal/legalPaths';
import { LegalPageView } from '@/components/legal/LegalPageView';
import { TERMS_SECTIONS, TERMS_TITLE } from '@/components/legal/termsContent';

export const metadata: Metadata = {
  title: '이용약관 · SIDE',
  description: 'SIDE 이용에 필요한 조건과 절차, 이용자와 운영자의 권리·의무를 안내합니다.',
};

/** 내용이 상수라 데이터 조회가 없다. 빌드 시 한 번 만들어 그대로 서빙된다(재검증 불필요). */
const TermsPage = () => (
  <LegalPageView title={TERMS_TITLE} updatedAt={LEGAL_EFFECTIVE_DATE} sections={TERMS_SECTIONS} />
);

export default TermsPage;
