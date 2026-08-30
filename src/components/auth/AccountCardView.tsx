import { getUserInitial } from '@/components/auth/getUserInitial';
import { CardElement } from '@/components/common/CardElement';
import { CardView } from '@/components/common/CardView';
import type { SessionUser } from '@/domain/SessionUser';

import styles from './AccountCardView.module.css';

interface Props {
  user: SessionUser;
}

/** `/me` 상단 계정 카드. 로그아웃은 `POST /auth/signout` 폼 제출이다. 근거: docs/AuthSpec.md 4.4. */
export const AccountCardView = ({ user }: Props) => (
  <CardView as={CardElement.SECTION} className={styles.card}>
    {user.avatarUrl ? (
      // 외부 이미지 도메인(구글·카카오 CDN)이 계정마다 달라 next/image 대신 img 를 쓴다.
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.avatar} src={user.avatarUrl} alt="" width={48} height={48} />
    ) : (
      <span className={styles.initial} aria-hidden="true">
        {getUserInitial(user)}
      </span>
    )}

    <div className={styles.identity}>
      <span className={styles.name}>{user.name ?? '이름 없음'}</span>
      {user.email ? <span className={styles.email}>{user.email}</span> : null}
    </div>

    <form className={styles.form} action="/auth/signout" method="post">
      <button type="submit" className={styles.signOutButton}>
        로그아웃
      </button>
    </form>
  </CardView>
);
