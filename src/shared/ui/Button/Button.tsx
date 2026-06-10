import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icon, type IconName } from '@/shared/ui/Icon';

import styles from './Button.module.css';

type ButtonVariant = 'button1' | 'button2';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  children: ReactNode;
  iconRight?: IconName;
  variant?: ButtonVariant;
};

export function Button({ children, iconRight, type = 'button', variant = 'button1', ...props }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`} type={type} {...props}>
      <span>{children}</span>
      {iconRight ? <Icon className={styles.icon} name={iconRight} /> : null}
    </button>
  );
}
