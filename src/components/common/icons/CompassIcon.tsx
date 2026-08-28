import { BaseIcon } from '@/components/common/icons/BaseIcon';
import type { IconProps } from '@/components/common/icons/IconProps';

export const CompassIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </BaseIcon>
);
