import { BaseIcon } from '@/components/common/icons/BaseIcon';
import type { IconProps } from '@/components/common/icons/IconProps';

export const ListIcon = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h10" />
  </BaseIcon>
);
