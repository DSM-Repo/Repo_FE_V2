const RESERVED_PORTFOLIO_SLUGS = new Set(['api', 'dev', 'login', 'resume-books', 'teacher'])

export function normalizePortfolioSlug(slug: string) {
  return decodeURIComponent(slug).trim()
}

export function isReservedPortfolioSlug(slug: string) {
  return RESERVED_PORTFOLIO_SLUGS.has(normalizePortfolioSlug(slug).toLowerCase())
}
