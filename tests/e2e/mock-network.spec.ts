import { test, expect, apiBaseUrl } from './test-fixtures'
import { installMockNetworkGuard } from './mock-network'

test('blocks an unregistered remote API request before sending it', async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error('Expected local baseURL.')
  const context = await browser.newContext()
  const guard = await installMockNetworkGuard(context, baseURL)
  try {
    const page = await context.newPage()
    await page.goto(`${baseURL}/login`)
    const sent = await page.evaluate(async (url) => {
      try {
        await fetch(url, { method: 'POST' })
        return true
      } catch (error) {
        if (error instanceof TypeError) return false
        throw error
      }
    }, `${apiBaseUrl}/unregistered-save`)
    expect(sent).toBe(false)
    expect(guard.blockedRequests).toEqual([`POST ${new URL(apiBaseUrl).origin}/unregistered-save`])
  } finally {
    await guard.dispose()
    await context.close()
  }
})

test('blocks the local backend proxy while allowing explicit API mocks', async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error('Expected local baseURL.')
  const context = await browser.newContext()
  const guard = await installMockNetworkGuard(context, baseURL)
  try {
    const page = await context.newPage()
    await page.route(`${apiBaseUrl}/mocked`, (route) => route.fulfill({ json: { mocked: true } }))
    await page.goto(`${baseURL}/login`)
    const result = await page.evaluate(async ({ mocked, proxy }) => {
      const response = await fetch(mocked)
      const data: unknown = await response.json()
      let proxySent = true
      try {
        await fetch(proxy, { method: 'POST' })
      } catch (error) {
        if (!(error instanceof TypeError)) throw error
        proxySent = false
      }
      return { data, proxySent }
    }, { mocked: `${apiBaseUrl}/mocked`, proxy: `${baseURL}/api/backend/resume/save` })
    expect(result).toEqual({ data: { mocked: true }, proxySent: false })
    expect(guard.blockedRequests).toEqual([`POST ${new URL(baseURL).origin}/api/backend/resume/save`])
  } finally {
    await guard.dispose()
    await context.close()
  }
})
