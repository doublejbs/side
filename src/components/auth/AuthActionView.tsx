import Link from 'next/link';

import { getUserInitial } from '@/components/auth/getUserInitial';
import type { SessionUser } from '@/domain/SessionUser';

import styles from './AuthActionView.module.css';

interface Props {
  /** 서버 컴포넌트가 `getSessionUser()` 로 읽어 넘긴 사용자. 비로그인이면 null. */
  user: SessionUser | null;
  /** 비로그인일 때 이동할 로그인 경로(`?next=` 포함). */
  loginHref: string;
}

/** `AppHeaderView` 액션 슬롯에 들어가는 로그인/프로필 진입점. 근거: docs/AuthSpec.md 4.4. */
export const AuthActionView = ({ user, loginHref }: Props) => {
  if (!user) {
    return (
      <Link className={styles.loginLink} href={loginHref}>
        로그인
      </Link>
    );
  }

  const label = user.name ?? user.email ?? '내 프로필';

  return (
    <Link className={styles.profileLink} href="/me" aria-label={`${label} 프로필 보기`}>
      {user.avatarUrl ? (
        // 외부 이미지 도메인(구글·카카오 CDN)이 계정마다 달라 next/image 대신 img 를 쓴다.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.avatar} src={user.avatarUrl} alt="" width={32} height={32} />
      ) : (
        <span className={styles.initial} aria-hidden="true">
          {getUserInitial(user)}
        </span>
      )}
    </Link>
  );
};
