import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  children: ReactNode;
};

export function Button({ children, type = 'button', ...props }: ButtonProps) {
  return (
    <button className={styles.button} type={type} {...props}>
      {children}
    </button>
  );
}
