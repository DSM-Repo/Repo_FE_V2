import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';

type ButtonVariant = 'button1' | 'button2';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, type = 'button', variant = 'button1', ...props }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`} type={type} {...props}>
      {children}
    </button>
  );
}
