export type InternalHref = `/${string}`

export function isSafeInternalHref(href: string): href is InternalHref {
  return href.startsWith('/') && !href.startsWith('//') && !/[\u0000-\u001F\u007F]/.test(href)
}

export function assertSafeInternalHref(href: InternalHref): InternalHref {
  if (!isSafeInternalHref(href)) {
    throw new Error('Internal href must start with a single slash and cannot contain control characters.')
  }

  return href
}
