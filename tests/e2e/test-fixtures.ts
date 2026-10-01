import { expect, test as base } from '@playwright/test'
import { apiBaseUrl, installMockNetworkGuard } from './mock-network'

export { apiBaseUrl, expect }
export type { Page } from '@playwright/test'

export const test = base.extend<{ readonly mockNetwork: void }>({
  mockNetwork: [async ({ context, baseURL }, runFixture, testInfo) => {
    if (!baseURL) {
      throw new Error('Mock tests require the configured local app baseURL.')
    }
    const guard = await installMockNetworkGuard(context, baseURL)
    try {
      await runFixture()
    } finally {
      await guard.dispose()
      if (guard.blockedRequests.length > 0) {
        await testInfo.attach('unregistered-api-requests', {
          body: JSON.stringify(guard.blockedRequests, null, 2),
          contentType: 'application/json',
        })
      }
      expect(guard.blockedRequests, 'Register every API request; mock tests cannot reach a backend.').toEqual([])
    }
  }, { auto: true }],
})
