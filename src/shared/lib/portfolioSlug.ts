const RESERVED_PORTFOLIO_SLUGS = new Set([
  '_next', 'api', 'component-showcase', 'dev', 'favicon.ico', 'home', 'library',
  'login', 'majors', 'resume', 'resume-books', 'robots.txt', 'signup', 'sitemap.xml',
  'students', 'teacher',
])

export function normalizePortfolioSlug(slug: string) {
  try {
    return decodeURIComponent(slug).trim()
  } catch (error) {
    if (error instanceof URIError) return ''
    throw error
  }
}

export function isReservedPortfolioSlug(slug: string) {
  return RESERVED_PORTFOLIO_SLUGS.has(normalizePortfolioSlug(slug).toLowerCase())
}
