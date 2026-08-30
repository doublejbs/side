import styles from './SaveErrorView.module.css';

/** 서버 저장·조회가 실패했을 때 보여주는 인라인 안내. 진영 색을 쓰지 않고 중립 톤으로 적는다. */
export const SaveErrorView = () => (
  <p className={styles.message} role="alert">
    저장에 실패했어요. 다시 시도해 주세요.
  </p>
);
