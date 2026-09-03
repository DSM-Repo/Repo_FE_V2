import { expect, test } from '@playwright/test'

test.describe('auth login route', () => {
  test('renders the student login view and switches to teacher login', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: '학생 로그인' })).toBeVisible()
    const emailInput = page.getByLabel('이메일')
    const passwordInput = page.getByLabel('비밀번호', { exact: true })
    const loginButton = page.getByRole('button', { name: '로그인' })

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(loginButton).toBeDisabled()
    await expect(page.getByText('계정이 없으신가요?')).toBeVisible()
    const signupLink = page.getByRole('link', { name: '회원가입' })
    await expect(signupLink).toHaveAttribute('href', '/signup')
    await expect(signupLink.locator('..')).toHaveCSS('font-size', '14px')

    const authCard = page.locator('main > div')
    await expect(authCard).toHaveCSS('width', '810px')
    await expect(authCard).toHaveCSS('height', '484px')

    await emailInput.focus()
    await passwordInput.focus()
    await expect(page.getByText('이메일을 입력해주세요.')).toBeVisible()
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-describedby', 'login-email-error')
    await page.keyboard.press('Tab')
    await expect(page.getByText('비밀번호를 입력해주세요.')).toBeVisible()
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
    await expect(passwordInput).toHaveAttribute('aria-describedby', 'login-password-error')

    await page.getByRole('button', { name: '비밀번호 보이기' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: '비밀번호 숨기기' })).toBeVisible()

    await emailInput.fill('student@dsm.hs.kr')
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(loginButton).toBeDisabled()
    await passwordInput.fill('repo-password')
    await expect(passwordInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(loginButton).toBeEnabled()

    await page.getByRole('button', { name: '선생님으로 전환하기' }).click()

    await expect(page.getByRole('heading', { name: '선생님 로그인' })).toBeVisible()
    await expect(page.getByText('DSM선생님을 위한 이력서 관리 플랫폼, Repo')).toBeVisible()
    await expect(page.getByRole('button', { name: '학생으로 전환하기' })).toBeVisible()
    await expect(emailInput).toHaveValue('student@dsm.hs.kr')
    await expect(passwordInput).toHaveValue('repo-password')
    await expect(loginButton).toBeEnabled()
    await expect(authCard).toHaveCSS('width', '810px')
    await expect(authCard).toHaveCSS('height', '484px')
  })

  test('stacks the brand and login form without overlap on mobile', async ({ page }) => {
    await page.setViewportSize({ height: 812, width: 375 })
    await page.goto('/login')

    const brandBox = await page.getByLabel('Repo 소개').boundingBox()
    const formBox = await page.getByRole('form', { name: '학생 로그인' }).boundingBox()

    expect(brandBox).not.toBeNull()
    expect(formBox).not.toBeNull()
    const brandBottom = (brandBox?.y ?? 0) + (brandBox?.height ?? 0)
    const formBottom = (formBox?.y ?? 0) + (formBox?.height ?? 0)
    const panelsDoNotOverlap = formBottom <= (brandBox?.y ?? 0) || brandBottom <= (formBox?.y ?? 0)

    expect(panelsDoNotOverlap).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  })

  for (const responseBody of ['', '{']) {
    const responseDescription = responseBody ? 'invalid JSON' : 'no JSON body'

    test(`shows a handled error when a successful login response has ${responseDescription}`, async ({ page }) => {
      await page.route('**/user/login', async (route) => {
        await route.fulfill({
          body: responseBody,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': '*',
          },
          status: 200,
        })
      })
      await page.goto('/login')

      await page.getByLabel('이메일').fill('student@dsm.hs.kr')
      await page.getByLabel('비밀번호', { exact: true }).fill('repo-password')
      await page.getByRole('button', { name: '로그인' }).click()

      await expect(page.getByText('로그인 응답 형식이 올바르지 않습니다.')).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })
  }
})
