import type { ReactNode } from 'react';

import { ChipTone } from '@/components/common/ChipTone';
import { joinClassNames } from '@/components/common/joinClassNames';

import styles from './ChipView.module.css';

interface Props {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}

const TONE_CLASS: Record<ChipTone, string> = {
  [ChipTone.NEUTRAL]: styles.neutral,
  [ChipTone.AGREE]: styles.agree,
  [ChipTone.DISAGREE]: styles.disagree,
};

export const ChipView = ({ children, tone = ChipTone.NEUTRAL, className }: Props) => (
  <span className={joinClassNames(styles.chip, TONE_CLASS[tone], className)}>{children}</span>
);
