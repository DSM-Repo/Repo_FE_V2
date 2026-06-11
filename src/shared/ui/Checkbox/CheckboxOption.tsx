import type { ReactNode } from 'react';

import { Checkbox, type CheckboxProps } from './Checkbox';
import styles from './Checkbox.module.css';

type CheckboxOptionProps = CheckboxProps & {
  children: ReactNode;
};

export function CheckboxOption({ children, checked, disabled = false, onCheckedChange, ...props }: CheckboxOptionProps) {
  return (
    <label className={styles.option} data-checked={checked} data-disabled={disabled || undefined}>
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} {...props} />
      <span className={styles.optionText}>{children}</span>
    </label>
  );
}
