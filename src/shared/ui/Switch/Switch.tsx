import type { ButtonHTMLAttributes, MouseEvent } from 'react';

import styles from './Switch.module.css';

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'onChange' | 'role' | 'type'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ checked, disabled = false, onCheckedChange, onClick, ...props }: SwitchProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented || disabled) {
      return;
    }

    onCheckedChange(!checked);
  };

  return (
    <button
      aria-checked={checked}
      className={styles.switch}
      data-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      role="switch"
      type="button"
      {...props}
    >
      <span className={styles.thumb} />
    </button>
  );
}
