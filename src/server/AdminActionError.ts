import { AdminMessage } from '@/server/AdminMessage';

/** 화면에 그대로 보여줄 수 있는 결과 코드를 담은 오류. */
export class AdminActionError extends Error {
  readonly code: AdminMessage;

  constructor(code: AdminMessage) {
    super(code);
    this.name = 'AdminActionError';
    this.code = code;
  }
}

/** 어떤 오류든 화면용 코드로 바꾼다. */
export const toAdminMessage = (error: unknown): AdminMessage =>
  error instanceof AdminActionError ? error.code : AdminMessage.ERROR_UNKNOWN;
