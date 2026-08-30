import type { IconProps } from '@/components/common/icons/IconProps';

/**
 * 카카오 말풍선 마크. 브랜드 가이드가 색을 정하므로 토큰이 아닌 지정 색을 그대로 쓴다.
 * 근거: docs/AuthSpec.md 4.1.
 */
export const KakaoMarkIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path
      fill="#191919"
      d="M9 1.5C4.86 1.5 1.5 4.14 1.5 7.4c0 2.09 1.38 3.92 3.46 4.96l-.87 3.2c-.08.28.24.5.48.34l3.83-2.53c.2.02.4.03.6.03 4.14 0 7.5-2.64 7.5-5.9S13.14 1.5 9 1.5Z"
    />
  </svg>
);
