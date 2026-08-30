import styles from './LoginErrorView.module.css';

/** 로그인 실패 안내. 콜백 실패(`?error=1`)와 클라이언트 시작 실패에 같은 문구를 쓴다. */
export const LoginErrorView = () => (
  <p className={styles.message} role="alert">
    로그인에 실패했어요. 다시 시도해 주세요.
  </p>
);
