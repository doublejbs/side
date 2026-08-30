import { getAnonCookieSecret } from '@/server/anonCookie';
import { getVoteStore } from '@/server/getVoteStore';
import type { VoteStore } from '@/server/VoteStore';

/** 서버 투표에 필요한 의존성. 둘 다 있을 때만 쓰기 API 를 연다. */
export interface ServerVoteContext {
  store: VoteStore;
  secret: string;
}

/**
 * 서버 투표 저장소와 쿠키 서명 비밀키가 모두 있으면 함께 돌려준다.
 * 라우트 핸들러는 이 함수로 의존성을 받고, 페이지는 `isServerVoteEnabled` 로 켜짐 여부만 본다.
 */
export const getServerVoteContext = (): ServerVoteContext | null => {
  const store = getVoteStore();
  const secret = getAnonCookieSecret();

  if (!store || !secret) {
    return null;
  }

  return { store, secret };
};

/**
 * 서버 모드 판정. API 라우트와 페이지가 같은 조건을 쓰도록 이 함수 하나만 본다.
 * (`DATABASE_URL` 만 보면 쿠키 비밀키가 없을 때 클라이언트가 503 을 받는 요청을 계속 보낸다.)
 */
export const isServerVoteEnabled = (): boolean => getServerVoteContext() !== null;
