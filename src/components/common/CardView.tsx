import type { ReactNode } from 'react';

import { CardElement } from '@/components/common/CardElement';
import { CardTone } from '@/components/common/CardTone';
import { joinClassNames } from '@/components/common/joinClassNames';

import styles from './CardView.module.css';

interface Props {
  children: ReactNode;
  as?: CardElement;
  tone?: CardTone;
  className?: string;
  highlighted?: boolean;
  id?: string;
}

const TONE_CLASS: Record<CardTone, string> = {
  [CardTone.DEFAULT]: '',
  [CardTone.BRAND]: styles.brand,
};

export const CardView = ({
  children,
  as = CardElement.DIV,
  tone = CardTone.DEFAULT,
  className,
  highlighted = false,
  id,
}: Props) => {
  const Element = as;
  const classNames = joinClassNames(
    styles.card,
    TONE_CLASS[tone],
    highlighted && styles.highlighted,
    className,
  );

  return (
    <Element id={id} className={classNames}>
      {children}
    </Element>
  );
};
