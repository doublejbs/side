import { AdminBannerTone } from '@/components/admin/AdminBannerTone';
import { AdminBannerView } from '@/components/admin/AdminBannerView';

/** 목 모드(DATABASE_URL 없음)에서 관리자 화면이 비어 보이는 이유를 알려 준다. */
export const DatabaseNoticeView = () => (
  <AdminBannerView tone={AdminBannerTone.WARNING} title="DB 미연결">
    {
      'DATABASE_URL 이 설정되지 않아 검수할 데이터가 없습니다.\ndocker compose up -d 로 Postgres 를 띄우고 .env 에 DATABASE_URL 을 넣은 뒤 npm run db:migrate 를 실행해 주세요.'
    }
  </AdminBannerView>
);
