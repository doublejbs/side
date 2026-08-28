import { BaseIcon } from '@/components/common/icons/BaseIcon';
import type { IconProps } from '@/components/common/icons/IconProps';

export const PersonIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </BaseIcon>
);
