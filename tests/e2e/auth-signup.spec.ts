import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const documentElement = document.documentElement
    const elementRects = Array.from(document.body.querySelectorAll('*'))
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)

    return {
      clientWidth: documentElement.clientWidth,
      maxRight: Math.max(...elementRects.map((rect) => rect.right)),
      minLeft: Math.min(...elementRects.map((rect) => rect.left)),
      scrollWidth: documentElement.scrollWidth,
    }
  })

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
  expect(metrics.minLeft).toBeGreaterThanOrEqual(-1)
  expect(metrics.maxRight).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

test.describe('auth signup route', () => {
  test('links back to login from the signup email step', async ({ page }) => {
    await page.goto('/signup')

    await page.getByRole('link', { name: '로그인' }).click()

    await expect(page).toHaveURL(/\/login$/)
  })

  test('keeps signup fields inside the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto('/signup')

    await expect(page.getByRole('heading', { name: '이메일을 입력해주세요' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expect(page.locator('main > div')).toHaveCSS('height', '682px')
  })
})
