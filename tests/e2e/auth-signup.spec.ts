import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

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
  test('displays server error.message for email send and verification failures', async ({ page }) => {
    let sends = 0
    await page.route(`${apiBaseUrl}/user/email/send`, (route) => {
      sends += 1
      return route.fulfill(sends === 1
        ? { status: 429, contentType: 'application/json', body: JSON.stringify({ error: { message: '서버 발송 제한 메시지' } }) }
        : { status: 204 })
    })
    await page.route(`${apiBaseUrl}/user/email/verify`, (route) => route.fulfill({
      status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: '서버 인증 실패 메시지' } }),
    }))
    await page.goto('/signup')
    await page.locator('#signup-email').fill('student')
    await page.getByRole('button', { name: '인증', exact: true }).click()
    await expect(page.getByText('서버 발송 제한 메시지', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '인증', exact: true }).click()
    await page.getByRole('textbox', { name: '인증코드', exact: true }).fill('123456')
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await expect(page.getByText('서버 인증 실패 메시지', { exact: true })).toBeVisible()
  })

  test('accepts 204 responses for email send, resend and verification', async ({ page }) => {
    await page.route(`${apiBaseUrl}/user/email/send`, (route) => route.fulfill({ status: 204 }))
    await page.route(`${apiBaseUrl}/user/email/verify`, (route) => route.fulfill({ status: 204 }))
    await page.goto('/signup')
    await page.locator('#signup-email').fill('student')
    await page.getByRole('button', { name: '인증', exact: true }).click()
    await expect(page.getByText('인증 코드를 전송했습니다.', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: '인증코드', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: '재전송', exact: true }).click()
    await expect(page.getByRole('button', { name: '재전송', exact: true })).toBeEnabled()
    await page.getByRole('textbox', { name: '인증코드', exact: true }).fill('123456')
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await expect(page.getByLabel('이름', { exact: true })).toBeVisible()
  })

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
