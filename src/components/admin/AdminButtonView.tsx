import type { ReactNode } from 'react';

import { AdminButtonTone } from '@/components/admin/AdminButtonTone';
import { joinClassNames } from '@/components/common/joinClassNames';

import styles from './AdminButtonView.module.css';

interface Props {
  children: ReactNode;
  /** 폼의 기본 액션 대신 이 버튼만 다른 서버 액션으로 제출한다. */
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  tone?: AdminButtonTone;
  className?: string;
  disabled?: boolean;
  /** 비활성 사유처럼 짧은 보조 설명. 화면의 안내 문구와 같은 문장을 넘긴다. */
  title?: string;
}

const TONE_CLASS: Record<AdminButtonTone, string> = {
  [AdminButtonTone.DEFAULT]: styles.default,
  [AdminButtonTone.PRIMARY]: styles.primary,
  [AdminButtonTone.DANGER]: styles.danger,
  [AdminButtonTone.QUIET]: styles.quiet,
};

export const AdminButtonView = ({
  children,
  formAction,
  name,
  value,
  tone = AdminButtonTone.DEFAULT,
  className,
  disabled = false,
  title,
}: Props) => (
  <button
    type="submit"
    formAction={formAction}
    name={name}
    value={value}
    disabled={disabled}
    title={title}
    className={joinClassNames(styles.button, TONE_CLASS[tone], className)}
  >
    {children}
  </button>
);
