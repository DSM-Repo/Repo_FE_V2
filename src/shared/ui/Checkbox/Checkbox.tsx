import type { ChangeEvent, InputHTMLAttributes } from 'react';

import styles from './Checkbox.module.css';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Checkbox({ checked, className, disabled = false, onCheckedChange, ...props }: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCheckedChange(event.target.checked);
  };

  return (
    <span className={[styles.checkbox, className].filter(Boolean).join(' ')} data-disabled={disabled || undefined}>
      <input
        checked={checked}
        className={styles.input}
        disabled={disabled}
        onChange={handleChange}
        type="checkbox"
        {...props}
      />
      <span aria-hidden="true" className={styles.box} data-checked={checked}>
        <svg className={styles.checkIcon} fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        </svg>
      </span>
    </span>
  );
}
