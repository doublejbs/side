import type { ReactNode } from 'react';

import type { IconProps } from '@/components/common/icons/IconProps';

interface Props extends IconProps {
  children: ReactNode;
}

/** 아이콘 공통 svg 껍데기. 개별 아이콘은 path 만 정의한다. */
export const BaseIcon = ({ size = 24, color = 'currentColor', children }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);
