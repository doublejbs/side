import { AdminBannerTone } from '@/components/admin/AdminBannerTone';
import { AdminMessage } from '@/server/AdminMessage';

export interface AdminBannerContent {
  tone: AdminBannerTone;
  text: string;
}

const CONTENT: Record<AdminMessage, AdminBannerContent> = {
  [AdminMessage.SAVED]: { tone: AdminBannerTone.SUCCESS, text: '저장했습니다.' },
  [AdminMessage.CLAIM_SAVED]: { tone: AdminBannerTone.SUCCESS, text: '주장을 저장했습니다.' },
  [AdminMessage.EVIDENCE_SAVED]: {
    tone: AdminBannerTone.SUCCESS,
    text: '근거 타입을 저장했습니다.',
  },
  [AdminMessage.EVIDENCE_DELETED]: { tone: AdminBannerTone.SUCCESS, text: '근거를 삭제했습니다.' },
  [AdminMessage.PUBLISHED]: {
    tone: AdminBannerTone.SUCCESS,
    text: '승인했습니다. 이제 앱에 노출됩니다.',
  },
  [AdminMessage.REJECTED]: { tone: AdminBannerTone.SUCCESS, text: '반려했습니다.' },
  [AdminMessage.REGENERATED]: {
    tone: AdminBannerTone.SUCCESS,
    text: '요약과 논점을 다시 생성했습니다.',
  },
  [AdminMessage.QUERY_SAVED]: { tone: AdminBannerTone.SUCCESS, text: '키워드를 저장했습니다.' },
  [AdminMessage.PUBLISHER_SAVED]: { tone: AdminBannerTone.SUCCESS, text: '매체를 저장했습니다.' },
  [AdminMessage.PUBLISHER_DELETED]: {
    tone: AdminBannerTone.SUCCESS,
    text: '매체를 삭제했습니다.',
  },
  [AdminMessage.ERROR_NOT_FOUND]: {
    tone: AdminBannerTone.ERROR,
    text: '대상을 찾을 수 없습니다.',
  },
  [AdminMessage.ERROR_EMPTY_QUESTION]: {
    tone: AdminBannerTone.ERROR,
    text: '질문을 입력해 주세요.',
  },
  [AdminMessage.ERROR_EMPTY_NOTE]: {
    tone: AdminBannerTone.ERROR,
    text: '반려 메모를 입력해 주세요.',
  },
  [AdminMessage.ERROR_EMPTY_KEYWORD]: {
    tone: AdminBannerTone.ERROR,
    text: '키워드를 입력해 주세요.',
  },
  [AdminMessage.ERROR_EMPTY_PUBLISHER]: {
    tone: AdminBannerTone.ERROR,
    text: '도메인과 매체명을 모두 입력해 주세요.',
  },
  [AdminMessage.ERROR_INVALID_URL]: {
    tone: AdminBannerTone.ERROR,
    text: 'http 또는 https 로 시작하는 주소만 저장할 수 있습니다.',
  },
  [AdminMessage.ERROR_NOT_REVIEWABLE]: {
    tone: AdminBannerTone.ERROR,
    text: '검수 대기 상태의 이슈만 승인할 수 있습니다.',
  },
  [AdminMessage.ERROR_EVIDENCE_MISMATCH]: {
    tone: AdminBannerTone.ERROR,
    text: '이 이슈에 속하지 않은 근거입니다.',
  },
  [AdminMessage.ERROR_NO_DATABASE]: {
    tone: AdminBannerTone.ERROR,
    text: 'DATABASE_URL 이 없어 데이터를 바꿀 수 없습니다.',
  },
  [AdminMessage.ERROR_PIPELINE_ENV]: {
    tone: AdminBannerTone.ERROR,
    text: '파이프라인 환경 변수(OPENAI_API_KEY 등)가 없어 다시 생성할 수 없습니다.',
  },
  [AdminMessage.ERROR_REGENERATE_NOT_ALLOWED]: {
    tone: AdminBannerTone.ERROR,
    text: '발행됐거나 반려된 이슈는 다시 생성할 수 없습니다.',
  },
  [AdminMessage.ERROR_REGENERATE_FAILED]: {
    tone: AdminBannerTone.ERROR,
    text: '다시 생성에 실패했습니다. 서버 로그를 확인해 주세요.',
  },
  [AdminMessage.ERROR_UNKNOWN]: {
    tone: AdminBannerTone.ERROR,
    text: '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
};

const isAdminMessage = (value: string | null | undefined): value is AdminMessage =>
  Boolean(value) && Object.values(AdminMessage).includes(value as AdminMessage);

/** `?message=` 값을 배너 내용으로 바꾼다. 모르는 값이면 배너를 띄우지 않는다. */
export const toAdminBannerContent = (value: string | null | undefined): AdminBannerContent | null =>
  isAdminMessage(value) ? CONTENT[value] : null;
