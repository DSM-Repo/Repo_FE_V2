import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icon, type IconName } from '@/shared/ui/Icon';

import styles from './Button.module.css';

export type ButtonVariant = 'filled' | 'bordered-dark';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  children: ReactNode;
  iconRight?: IconName;
  variant?: ButtonVariant;
};

const variantClassName: Record<ButtonVariant, string> = {
  filled: styles.filled,
  'bordered-dark': styles.borderedDark,
};

export function Button({ children, iconRight, type = 'button', variant = 'filled', ...props }: ButtonProps) {
  return (
    <button className={`${styles.button} ${variantClassName[variant]}`} type={type} {...props}>
      <span>{children}</span>
      {iconRight ? <Icon className={styles.icon} name={iconRight} /> : null}
    </button>
  );
}
