import type { SVGProps } from 'react';

export type IconName = 'right-arrow';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName;
};

export function Icon({ name, 'aria-hidden': ariaHidden = true, focusable = false, ...props }: IconProps) {
  if (name === 'right-arrow') {
    return <RightArrowIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />;
  }

  return null;
}

function RightArrowIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
