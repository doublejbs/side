import { BaseIcon } from '@/components/common/icons/BaseIcon';
import type { IconProps } from '@/components/common/icons/IconProps';

export const ArrowRightIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M5 12h13" />
    <path d="M12 6l6 6-6 6" />
  </BaseIcon>
);
