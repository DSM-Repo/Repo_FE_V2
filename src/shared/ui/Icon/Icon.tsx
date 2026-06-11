import type { SVGProps } from 'react';

export type IconName = 'plus' | 'right-arrow';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName;
};

export function Icon({ name, 'aria-hidden': ariaHidden = true, focusable = false, ...props }: IconProps) {
  if (name === 'plus') {
    return <PlusIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />;
  }

  if (name === 'right-arrow') {
    return <RightArrowIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />;
  }

  return null;
}

function PlusIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 2V14M2 8H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function RightArrowIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5 2L11 8L5 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
