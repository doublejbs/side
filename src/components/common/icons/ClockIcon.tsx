import { BaseIcon } from '@/components/common/icons/BaseIcon';
import type { IconProps } from '@/components/common/icons/IconProps';

export const ClockIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </BaseIcon>
);
