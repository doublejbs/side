import Link from 'next/link';
import type { ReactNode } from 'react';

import { ArrowRightIcon } from '@/components/common/icons/ArrowRightIcon';
import { joinClassNames } from '@/components/common/joinClassNames';

import styles from './ArrowLinkView.module.css';

interface Props {
  children: ReactNode;
  /** 비우면 링크가 아닌 라벨(span)로 렌더한다. 카드 전체가 링크인 곳에서 중첩 링크를 피하기 위함. */
  href?: string;
  external?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const ArrowLinkView = ({ children, href, external, ariaLabel, className }: Props) => {
  const content = (
    <>
      {children}
      <ArrowRightIcon size={14} />
    </>
  );

  if (!href) {
    return <span className={joinClassNames(styles.arrowLink, className)}>{content}</span>;
  }

  if (external) {
    return (
      <a
        className={joinClassNames(styles.arrowLink, styles.tappable, className)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      className={joinClassNames(styles.arrowLink, styles.tappable, className)}
      href={href}
      aria-label={ariaLabel}
    >
      {content}
    </Link>
  );
};
