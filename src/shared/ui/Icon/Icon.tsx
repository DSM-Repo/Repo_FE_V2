import type { SVGProps } from 'react'

export type IconName = 'chevron-right' | 'eye' | 'eye-off' | 'login' | 'plus' | 'right-arrow'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName
}

export function Icon({ name, 'aria-hidden': ariaHidden = true, focusable = false, ...props }: IconProps) {
  if (name === 'chevron-right') {
    return <ChevronRightIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />
  }

  if (name === 'eye') {
    return <EyeIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />
  }

  if (name === 'eye-off') {
    return <EyeOffIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />
  }

  if (name === 'login') {
    return <LoginIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />
  }

  if (name === 'plus') {
    return <PlusIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />
  }

  if (name === 'right-arrow') {
    return <RightArrowIcon aria-hidden={ariaHidden} focusable={focusable} {...props} />
  }

  return null
}

function ChevronRightIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function EyeIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M1.33 8.65C1.11 8.24 1.11 7.76 1.33 7.35C2.62 4.97 5.11 3.33 8 3.33C10.89 3.33 13.38 4.97 14.67 7.35C14.89 7.76 14.89 8.24 14.67 8.65C13.38 11.03 10.89 12.67 8 12.67C5.11 12.67 2.62 11.03 1.33 8.65Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M8 10.15A2.15 2.15 0 1 0 8 5.85A2.15 2.15 0 0 0 8 10.15Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function EyeOffIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M9.52 9.52A2.15 2.15 0 0 1 6.48 6.48M12.54 11.18C11.22 12.12 9.67 12.67 8 12.67C5.11 12.67 2.62 11.03 1.33 8.65C1.11 8.24 1.11 7.76 1.33 7.35C1.9 6.3 2.71 5.39 3.67 4.69M6.61 3.51C7.06 3.39 7.52 3.33 8 3.33C10.89 3.33 13.38 4.97 14.67 7.35C14.89 7.76 14.89 8.24 14.67 8.65C14.42 9.11 14.13 9.54 13.8 9.93M2 2L14 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function LoginIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M9.33 5.33L12 8M12 8L9.33 10.67M12 8H5.33M7.33 3.33H4C3.26 3.33 2.67 3.93 2.67 4.67V11.33C2.67 12.07 3.26 12.67 4 12.67H7.33"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function PlusIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 2V14M2 8H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function RightArrowIcon(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5 2L11 8L5 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}
