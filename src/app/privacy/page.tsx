import type { Metadata } from 'next';

import { LEGAL_EFFECTIVE_DATE } from '@/components/legal/legalPaths';
import { LegalPageView } from '@/components/legal/LegalPageView';
import { PRIVACY_SECTIONS, PRIVACY_TITLE } from '@/components/legal/privacyContent';

export const metadata: Metadata = {
  title: '개인정보처리방침 · SIDE',
  description: 'SIDE 가 수집하는 정보와 이용 목적, 보관·파기 기준을 안내합니다.',
};

/** 내용이 상수라 데이터 조회가 없다. 빌드 시 한 번 만들어 그대로 서빙된다(재검증 불필요). */
const PrivacyPage = () => (
  <LegalPageView
    title={PRIVACY_TITLE}
    updatedAt={LEGAL_EFFECTIVE_DATE}
    sections={PRIVACY_SECTIONS}
  />
);

export default PrivacyPage;
