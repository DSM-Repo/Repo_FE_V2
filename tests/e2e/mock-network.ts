import type { BrowserContext, Route } from '@playwright/test'

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://api.repo.test').replace(/\/$/, '')

export async function installMockNetworkGuard(context: BrowserContext, appBaseUrl: string) {
  const appOrigin = new URL(appBaseUrl).origin
  const blockedRequests: string[] = []
  const handleRequest = async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const isBackend = request.url() === apiBaseUrl || request.url().startsWith(`${apiBaseUrl}/`)
      || (url.origin === appOrigin && url.pathname.startsWith('/api/backend/'))

    if (!isBackend && url.origin === appOrigin) {
      await route.continue()
      return
    }

    if (isBackend || request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
      blockedRequests.push(`${request.method()} ${url.origin}${url.pathname}`)
    }
    await route.abort('blockedbyclient')
  }

  await context.route('**/*', handleRequest)
  return {
    blockedRequests,
    dispose: () => context.unroute('**/*', handleRequest),
  }
}
