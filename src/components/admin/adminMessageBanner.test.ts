import { AdminBannerTone } from '@/components/admin/AdminBannerTone';
import { AdminMessage } from '@/server/AdminMessage';

import { toAdminBannerContent } from './adminMessageBanner';

describe('toAdminBannerContent', () => {
  it('성공 코드는 성공 배너로 바꾼다', () => {
    expect(toAdminBannerContent(AdminMessage.PUBLISHED)).toMatchObject({
      tone: AdminBannerTone.SUCCESS,
    });
  });

  it('오류 코드는 오류 배너로 바꾼다', () => {
    expect(toAdminBannerContent(AdminMessage.ERROR_PIPELINE_ENV)).toMatchObject({
      tone: AdminBannerTone.ERROR,
    });
  });

  it('모르는 값이면 배너를 만들지 않는다', () => {
    expect(toAdminBannerContent(undefined)).toBeNull();
    expect(toAdminBannerContent('WHATEVER')).toBeNull();
  });

  it('모든 코드에 문구가 있다', () => {
    for (const message of Object.values(AdminMessage)) {
      expect(toAdminBannerContent(message)?.text).toBeTruthy();
    }
  });
});
