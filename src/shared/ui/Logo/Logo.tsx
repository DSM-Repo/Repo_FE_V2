import Image from 'next/image';

import styles from './Logo.module.css';

export type LogoTone = 'dark' | 'light';

type LogoProps = {
  tone?: LogoTone;
};

const logoToneClassName: Record<LogoTone, string> = {
  dark: styles.dark,
  light: styles.light,
};

export function Logo({ tone = 'light' }: LogoProps) {
  return (
    <div aria-label="Repo" className={`${styles.logo} ${logoToneClassName[tone]}`}>
      <Image alt="" height={24} src="/Repo%20Logo.png" width={24} />
      <span className={styles.text}>Repo</span>
    </div>
  );
}
